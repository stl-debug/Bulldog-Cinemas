const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { encryptText, decryptText } = require("../utils/crypto");
const { sendEmail } = require("../utils/email");

const JWT_SECRET = process.env.JWT_SECRET;

// Auth middleware
async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization" });
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Get profile
router.get("/", auth, async (req, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  // Mask cards — only show last4 and brand, decrypted not necessary; but we decrypt last4 was stored plaintext
  const cardsView = (user.paymentCards || []).map(c => ({
    id: c._id,
    last4: c.last4,
    brand: c.brand,
    expiryMonth: c.expiryMonth,
    expiryYear: c.expiryYear,
    addedAt: c.addedAt
  }));

  res.json({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    promotions: user.promotions,
    addresses: user.addresses,
    paymentCards: cardsView
  });
});

// Update profile (edit)
router.put("/", auth, async (req, res) => {
  const { firstName, lastName, promotions, address, addCard, removeCardId, changePassword, currentPassword } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Update basic fields
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (typeof promotions === "boolean") user.promotions = promotions;

  // Address: allow only 1 address
  if (address) {
    user.addresses = [address]; // replace existing or add first one
  }

  // Remove card
  if (removeCardId) {
    user.paymentCards = user.paymentCards.filter(c => c._id.toString() !== removeCardId);
  }

  // Add card (encrypted)
  if (addCard) {
    if (user.paymentCards.length >= 4) return res.status(400).json({ error: "Max 4 cards allowed" });
    const { cardNumber, cardHolder, expiryMonth, expiryYear, brand } = addCard;
    if (!cardNumber) return res.status(400).json({ error: "Card number required" });
    const encrypted = encryptText(cardNumber);
    const last4 = cardNumber.slice(-4);
    user.paymentCards.push({
      cardNumberEncrypted: encrypted,
      last4,
      cardHolderName,
      expiryMonth,
      expiryYear,
    });
  }

  // Change password: requires current password
  if (changePassword) {
    if (!currentPassword) return res.status(400).json({ error: "Current password required" });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Incorrect current password" });
    user.passwordHash = await bcrypt.hash(changePassword, parseInt(process.env.BCRYPT_SALT_ROUNDS || "12"));
    // send email notifying change
    await sendEmail(user.email, "Profile changed", "<p>Your password has been changed.</p>");
  }

  await user.save();

  res.json({ message: "Profile updated" });
});

module.exports = router;
