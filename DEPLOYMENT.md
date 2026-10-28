# DEPLOYMENT GUIDE — PROJECT BLACKVAULT

This document outlines how to deploy BLACKVAULT to production using free-tier modern web hosting (such as Vercel, Netlify, or Cloudflare Pages) with Supabase as the backend.

---

## 1. Supabase Project Setup

1. Create a free Supabase project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **API** and copy:
   - **Project URL**
   - **anon / public key**
3. Navigate to **SQL Editor** -> **New query**.
4. Paste the contents of [`supabase/migrations/20261029000000_blackvault_schema.sql`](supabase/migrations/20261029000000_blackvault_schema.sql) and click **Run**.
5. Navigate to **Authentication** -> **Providers** -> **Email**:
   - Ensure Email authentication is enabled.
   - Disable **Confirm email** if you want immediate single-owner sign-in.
   - In **Auth Policies**, ensure signups are restricted or will be guarded by the single-owner trigger.

---

## 2. Deploying Frontend

### Option A: Vercel

1. Push your repository to GitHub / GitLab.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the `BlackVault` repository.
4. Set Build Settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Configure Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key
6. Click **Deploy**.

### Option B: Cloudflare Pages

1. Log into the Cloudflare Dashboard and select **Workers & Pages**.
2. Click **Create Application** -> **Pages** -> **Connect to Git**.
3. Select the `BlackVault` repository.
4. Set Build Settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Save and Deploy**.

---

## 3. Post-Deployment Verification

1. Navigate to your live HTTPS production URL.
2. You will be greeted by the **BLACKVAULT PRIVATE ACCESS** screen.
3. Click **SETUP OWNER**.
4. Enter your email and master password to complete initialization.
5. In your Supabase Dashboard, confirm that the single row in `owner_profiles` has been created.
6. Attempting to register another account will be rejected automatically by PostgreSQL trigger `trg_single_owner`.
