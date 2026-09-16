/**
 * Utility functions for local offline password hashing and security
 */

export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(plainText);
  return hashedInput === hash;
}
