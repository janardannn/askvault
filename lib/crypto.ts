/**
 * Client-side encryption of the OpenRouter API key.
 *
 * The key is encrypted with AES-GCM using a key derived from the user's
 * passphrase via PBKDF2. Only the resulting ciphertext (plus salt + IV) is
 * persisted — never the passphrase or the raw API key. Decryption fails if the
 * passphrase is wrong, which is how we "log the user in".
 */

export interface EncryptedBlob {
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
}

const enc = new TextEncoder();
const dec = new TextDecoder();
const PBKDF2_ITERATIONS = 310_000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSecret(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(plaintext),
  );
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

/** Throws if the passphrase is wrong (AES-GCM authentication failure). */
export async function decryptSecret(
  blob: EncryptedBlob,
  passphrase: string,
): Promise<string> {
  const key = await deriveKey(passphrase, fromBase64(blob.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(blob.iv) as BufferSource },
    key,
    fromBase64(blob.ciphertext) as BufferSource,
  );
  return dec.decode(plaintext);
}
