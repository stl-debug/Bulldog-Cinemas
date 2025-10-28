const crypto = require("crypto");



const ALGORITHM = "aes-256-gcm";          
const KEY_HEX = process.env.ENCRYPTION_KEY || "";
const KEY = Buffer.from(KEY_HEX, "hex");

if (KEY.length !== 32) {
  throw new Error(
    "Invalid ENCRYPTION_KEY. Provide exactly 64 hex characters (32 bytes) in process.env.ENCRYPTION_KEY."
  );
}


function encryptText(plainText) {
  const iv = crypto.randomBytes(12); 
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}


function decryptText(payloadBase64) {
  try {
    const data = Buffer.from(payloadBase64, "base64");
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const ciphertext = data.slice(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch (err) {
    throw new Error("Decryption failed: invalid payload or auth tag");
  }
}

module.exports = {
  encryptText,
  decryptText,
};
