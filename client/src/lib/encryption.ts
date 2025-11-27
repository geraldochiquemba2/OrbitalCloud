/**
 * Client-Side Encryption Module for AngoCloud
 * Uses Web Crypto API for AES-256-GCM encryption
 * 
 * Flow:
 * 1. User password → PBKDF2 → Encryption Key
 * 2. File + Key → AES-GCM Encrypt → Encrypted File
 * 3. Encrypted File + Key → AES-GCM Decrypt → Original File
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedData {
  iv: Uint8Array;
  data: Uint8Array;
}

export interface EncryptedFile {
  encryptedBuffer: ArrayBuffer;
  originalSize: number;
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return arrayBufferToBase64(salt.buffer);
}

/**
 * Derive an encryption key from password and salt using PBKDF2
 */
export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const salt = base64ToArrayBuffer(saltBase64);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to a storable format (for session storage)
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import key from stored format
 */
export async function importKey(keyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive and export key for storage
 */
export async function deriveAndExportKey(password: string, saltBase64: string): Promise<string> {
  const key = await deriveKey(password, saltBase64);
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Encrypt a file buffer using AES-GCM
 * Returns the encrypted data with IV prepended
 */
export async function encryptFile(file: File, key: CryptoKey): Promise<EncryptedFile> {
  const fileBuffer = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    fileBuffer
  );
  
  const result = new Uint8Array(IV_LENGTH + encryptedData.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedData), IV_LENGTH);
  
  return {
    encryptedBuffer: result.buffer,
    originalSize: fileBuffer.byteLength
  };
}

/**
 * Encrypt an ArrayBuffer using AES-GCM
 */
export async function encryptBuffer(buffer: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    buffer
  );
  
  const result = new Uint8Array(IV_LENGTH + encryptedData.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedData), IV_LENGTH);
  
  return result.buffer;
}

/**
 * Decrypt an encrypted buffer (with IV prepended)
 */
export async function decryptBuffer(encryptedBuffer: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const encryptedData = new Uint8Array(encryptedBuffer);
  const iv = encryptedData.slice(0, IV_LENGTH);
  const data = encryptedData.slice(IV_LENGTH);
  
  return crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    data
  );
}

/**
 * Decrypt a file and return as Blob
 */
export async function decryptFile(
  encryptedBuffer: ArrayBuffer, 
  key: CryptoKey, 
  mimeType: string
): Promise<Blob> {
  const decrypted = await decryptBuffer(encryptedBuffer, key);
  return new Blob([decrypted], { type: mimeType });
}

/**
 * Create a download URL from decrypted data
 */
export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke a download URL to free memory
 */
export function revokeDownloadUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
}

/**
 * Storage key for encryption key in session
 */
export const ENCRYPTION_KEY_STORAGE = 'angocloud_encryption_key';

/**
 * Store encryption key in session storage
 */
export function storeEncryptionKey(keyBase64: string): void {
  sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, keyBase64);
}

/**
 * Retrieve encryption key from session storage
 */
export function getStoredEncryptionKey(): string | null {
  return sessionStorage.getItem(ENCRYPTION_KEY_STORAGE);
}

/**
 * Clear encryption key from session storage
 */
export function clearEncryptionKey(): void {
  sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE);
}

/**
 * Get the active encryption key (import from storage)
 */
export async function getActiveEncryptionKey(): Promise<CryptoKey | null> {
  const keyBase64 = getStoredEncryptionKey();
  if (!keyBase64) return null;
  
  try {
    return await importKey(keyBase64);
  } catch (error) {
    console.error('Failed to import encryption key:', error);
    return null;
  }
}
