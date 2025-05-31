const NodeRSA = require('node-rsa');
const crypto = require('crypto');

/**
 * Decrypts an OTP using hybrid encryption (AES-GCM + RSA)
 * @param {string} encryptedOtp - The encrypted OTP in format 'iv:authTag:encryptedData'
 * @param {string} publicKey - The RSA public key
 * @param {string} certKey - The certificate key (OTP_CERT_KEY)
 * @returns {string} The decrypted OTP
 */
function decryptOtp(encryptedOtp, publicKey, certKey) {
    // Split the components
    const [ivBase64, authTagBase64, encryptedBase64] = encryptedOtp.split(':');
    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
        throw new Error('Invalid encrypted data format');
    }

    // Convert components from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // First layer: AES decryption
    const key = crypto.scryptSync(certKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted;
    try {
        decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
    } catch (error) {
        throw new Error('Failed to decrypt with certificate key. Invalid OTP_CERT_KEY or corrupted data.');
    }

    // Second layer: RSA decryption
    const rsaKey = new NodeRSA();
    rsaKey.importKey(publicKey, 'public');
    return rsaKey.decryptPublic(decrypted, 'utf8');
}

module.exports = decryptOtp; 