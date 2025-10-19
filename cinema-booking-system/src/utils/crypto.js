const crypto = require('crypto');
const { buffer } = require('stream/consumers');

const ALGORITHM = 'aes-256-gcm';
const KEY = buffer.from(process.env.ENCRYPTION_KEY, 'hex'); 

if (!KEY || KEY.length !== 32) {
    throw new Error('Invalid encryption key. Key must be 32 bytes (64 hex characters).');
}

function encryptText(plainText) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptText(payloadBase64) {
    const data = Buffer.from(payloadBase64, 'base64');
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const encrypted = data.slice(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}

module.exports = {
    encryptText,
    decryptText,
};