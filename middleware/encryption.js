/**
 * Data Encryption Utilities
 * BPA Web Application - SkillSwap
 * 
 * Provides encryption for sensitive data at rest using AES-256-GCM
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits for AES-256

// Get encryption key from environment or generate a warning
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        console.warn('  WARNING: ENCRYPTION_KEY not set in environment. Using fallback key.');
        console.warn('  For production, set ENCRYPTION_KEY as a 64-character hex string.');
        // Fallback key for development (NOT SECURE FOR PRODUCTION)
        return Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    }

    // Key should be 64 hex characters = 32 bytes = 256 bits
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
        return Buffer.from(key, 'hex');
    }

    // If not hex, derive key from the string
    return crypto.scryptSync(key, 'skillswap-salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data
 */
function encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
        return plaintext;
    }

    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const authTag = cipher.getAuthTag();

        // Combine IV, auth tag, and ciphertext into a single string
        const combined = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, 'base64')
        ]).toString('base64');

        return combined;
    } catch (error) {
        console.error('Encryption error:', error.message);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt encrypted data
 */
function decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
        return encryptedData;
    }

    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedData, 'base64');

        // Extract IV, auth tag, and ciphertext
        const iv = combined.slice(0, IV_LENGTH);
        const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const ciphertext = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        // Return original if decryption fails (may be plaintext)
        return encryptedData;
    }
}

/**
 * Check if a string appears to be encrypted
 */
function isEncrypted(data) {
    if (!data || typeof data !== 'string') {
        return false;
    }

    try {
        const decoded = Buffer.from(data, 'base64');
        return decoded.length > IV_LENGTH + AUTH_TAG_LENGTH;
    } catch {
        return false;
    }
}

/**
 * Hash data for comparison (one-way, non-reversible)
 */
function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random token
 */
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt an email address for storage
 */
function encryptEmail(email) {
    return encrypt(email.toLowerCase().trim());
}

/**
 * Decrypt an email address
 */
function decryptEmail(encryptedEmail) {
    return decrypt(encryptedEmail);
}

module.exports = {
    encrypt,
    decrypt,
    isEncrypted,
    hash,
    generateToken,
    encryptEmail,
    decryptEmail,
    ALGORITHM
};
