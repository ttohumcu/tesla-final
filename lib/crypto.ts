
const textEncoder = new TextEncoder();

/**
 * Hashes a password with a given salt using SHA-256.
 * @param password The plain-text password to hash.
 * @param salt A random Uint8Array to prevent rainbow table attacks.
 * @returns A hex-encoded string of the hash.
 */
export const hashPassword = async (password: string, salt: Uint8Array): Promise<string> => {
  const passwordBuffer = textEncoder.encode(password);
  const saltedPassword = new Uint8Array(salt.length + passwordBuffer.length);
  
  saltedPassword.set(salt);
  saltedPassword.set(passwordBuffer, salt.length);

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', saltedPassword);
  
  // Convert ArrayBuffer to a hex string for storage
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Verifies a plain-text password against a stored salt and hash.
 * @param password The plain-text password to verify.
 * @param salt The salt that was used to create the original hash.
 * @param storedHash The stored hash to compare against.
 * @returns A boolean indicating whether the password is valid.
 */
export const verifyPassword = async (password: string, salt: Uint8Array, storedHash: string): Promise<boolean> => {
  const hashOfInput = await hashPassword(password, salt);
  return hashOfInput === storedHash;
};
