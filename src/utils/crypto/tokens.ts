import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM

/**
 * Derives a consistent 32-byte key from the environment variable.
 */
function getKey(): Buffer {
  const keyStr = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not defined in environment variables');
  }
  // If it's a 64-char hex string, use it directly (32 bytes)
  // Otherwise, hash it to ensure exactly 32 bytes for aes-256
  if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
    return Buffer.from(keyStr, 'hex');
  }
  return crypto.createHash('sha256').update(keyStr).digest();
}

/**
 * Encrypts a plaintext token using AES-256-GCM.
 */
export function encryptToken(text: string): string {
  if (!text) return text;
  
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // Backwards compatibility for plain text tokens if migration is incomplete
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) return encryptedText;
  
  const [ivHex, encryptedHex, authTagHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  try {
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt token', error);
    throw new Error('Token decryption failed');
  }
}
