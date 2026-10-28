import { getCrypto } from './kdf';

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean; // e.g. 0, O, 1, l, I, |
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS_CHARS = new Set(['0', 'O', 'o', '1', 'l', 'I', '|', '`', '\'', '"']);

/**
 * Cryptographically secure random integer in [0, max - 1]
 */
function secureRandomInt(max: number): number {
  const crypto = getCrypto();
  const array = new Uint32Array(1);
  const maxSafe = Math.floor(0xFFFFFFFF / max) * max;
  let val: number;
  do {
    crypto.getRandomValues(array);
    val = array[0];
  } while (val >= maxSafe);
  return val % max;
}

/**
 * Generates a cryptographically strong random password according to user options
 */
export function generatePassword(options: PasswordGeneratorOptions): string {
  let upper = UPPERCASE;
  let lower = LOWERCASE;
  let nums = NUMBERS;
  let syms = SYMBOLS;

  if (options.excludeAmbiguous) {
    upper = upper.split('').filter(c => !AMBIGUOUS_CHARS.has(c)).join('');
    lower = lower.split('').filter(c => !AMBIGUOUS_CHARS.has(c)).join('');
    nums = nums.split('').filter(c => !AMBIGUOUS_CHARS.has(c)).join('');
    syms = syms.split('').filter(c => !AMBIGUOUS_CHARS.has(c)).join('');
  }

  let charset = '';
  const mandatory: string[] = [];

  if (options.includeUppercase && upper.length > 0) {
    charset += upper;
    mandatory.push(upper[secureRandomInt(upper.length)]);
  }
  if (options.includeLowercase && lower.length > 0) {
    charset += lower;
    mandatory.push(lower[secureRandomInt(lower.length)]);
  }
  if (options.includeNumbers && nums.length > 0) {
    charset += nums;
    mandatory.push(nums[secureRandomInt(nums.length)]);
  }
  if (options.includeSymbols && syms.length > 0) {
    charset += syms;
    mandatory.push(syms[secureRandomInt(syms.length)]);
  }

  if (charset.length === 0) {
    charset = lower.length > 0 ? lower : LOWERCASE;
  }

  const result: string[] = [...mandatory];
  const remaining = Math.max(0, options.length - mandatory.length);

  for (let i = 0; i < remaining; i++) {
    result.push(charset[secureRandomInt(charset.length)]);
  }

  // Cryptographically shuffle using Fisher-Yates
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result.join('');
}
