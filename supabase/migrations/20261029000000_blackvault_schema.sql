-- ============================================================
-- BLACKVAULT DATABASE ARCHITECTURE & RLS MIGRATION
-- Single-Owner Personal Digital Vault Schema
-- ============================================================

-- 1. Helper function to ensure only UTC timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Owner Profile Table
-- Exactly 1 owner is permitted in the database.
CREATE TABLE IF NOT EXISTS public.owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Trigger to enforce strictly single-owner constraint
CREATE OR REPLACE FUNCTION enforce_single_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.owner_profiles) >= 1 THEN
    RAISE EXCEPTION 'BLACKVAULT is a single-owner application. New owner registration is forbidden.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_owner ON public.owner_profiles;
CREATE TRIGGER trg_single_owner
BEFORE INSERT ON public.owner_profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_single_owner();

-- 3. Security Helper Function for RLS
CREATE OR REPLACE FUNCTION public.is_blackvault_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.owner_profiles
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Vault Entries (Passwords & Custom Fields)
CREATE TABLE IF NOT EXISTS public.vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,
  encryption_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_vault_entries_updated_at
BEFORE UPDATE ON public.vault_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Vault Files
CREATE TABLE IF NOT EXISTS public.vault_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  encrypted_filename TEXT NOT NULL,
  encrypted_metadata TEXT NOT NULL,
  storage_object_id TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  encryption_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_vault_files_updated_at
BEFORE UPDATE ON public.vault_files
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Vault Notes
CREATE TABLE IF NOT EXISTS public.vault_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,
  encryption_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_vault_notes_updated_at
BEFORE UPDATE ON public.vault_notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Vault Achievements & Certificates
CREATE TABLE IF NOT EXISTS public.vault_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,
  encryption_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_vault_achievements_updated_at
BEFORE UPDATE ON public.vault_achievements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. Vault Settings
CREATE TABLE IF NOT EXISTS public.vault_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID UNIQUE NOT NULL REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
  encrypted_settings TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_vault_settings_updated_at
BEFORE UPDATE ON public.vault_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;

-- Owner Profiles Policies
CREATE POLICY "Owner profile viewable only by owner"
  ON public.owner_profiles FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Owner profile insertable only during initial owner setup"
  ON public.owner_profiles FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Owner profile updateable only by owner"
  ON public.owner_profiles FOR UPDATE
  USING (auth_user_id = auth.uid());

-- Vault Entries Policies
CREATE POLICY "Vault entries select owner only"
  ON public.vault_entries FOR SELECT
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault entries insert owner only"
  ON public.vault_entries FOR INSERT
  WITH CHECK (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault entries update owner only"
  ON public.vault_entries FOR UPDATE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault entries delete owner only"
  ON public.vault_entries FOR DELETE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

-- Vault Files Policies
CREATE POLICY "Vault files select owner only"
  ON public.vault_files FOR SELECT
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault files insert owner only"
  ON public.vault_files FOR INSERT
  WITH CHECK (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault files update owner only"
  ON public.vault_files FOR UPDATE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault files delete owner only"
  ON public.vault_files FOR DELETE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

-- Vault Notes Policies
CREATE POLICY "Vault notes select owner only"
  ON public.vault_notes FOR SELECT
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault notes insert owner only"
  ON public.vault_notes FOR INSERT
  WITH CHECK (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault notes update owner only"
  ON public.vault_notes FOR UPDATE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault notes delete owner only"
  ON public.vault_notes FOR DELETE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

-- Vault Achievements Policies
CREATE POLICY "Vault achievements select owner only"
  ON public.vault_achievements FOR SELECT
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault achievements insert owner only"
  ON public.vault_achievements FOR INSERT
  WITH CHECK (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault achievements update owner only"
  ON public.vault_achievements FOR UPDATE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault achievements delete owner only"
  ON public.vault_achievements FOR DELETE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

-- Vault Settings Policies
CREATE POLICY "Vault settings select owner only"
  ON public.vault_settings FOR SELECT
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault settings insert owner only"
  ON public.vault_settings FOR INSERT
  WITH CHECK (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Vault settings update owner only"
  ON public.vault_settings FOR UPDATE
  USING (public.is_blackvault_owner() AND owner_id IN (SELECT id FROM public.owner_profiles WHERE auth_user_id = auth.uid()));

-- ============================================================
-- STORAGE BUCKET CONFIGURATION (Private Bucket)
-- ============================================================
-- Insert private bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('blackvault-encrypted', 'blackvault-encrypted', false, 52428800) -- 50MB limit per file
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Owner access to encrypted files bucket"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'blackvault-encrypted' 
    AND public.is_blackvault_owner()
  )
  WITH CHECK (
    bucket_id = 'blackvault-encrypted' 
    AND public.is_blackvault_owner()
  );
