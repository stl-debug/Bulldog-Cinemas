// src/middleware/auth.js (or wherever you keep it)
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { sendEmail } = require("../utils/email");

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || process.env.BCRYPT_SALT_ROUNDS || "12", 10);
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d"; // keep consistent with server.js

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

/* ========================= REGISTER ========================= */
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, promotions } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const emailConfirmToken = generateToken();

    const user = new User({
      email,
      passwordHash,
      firstName,
      lastName,
      promotions: Boolean(promotions),
      emailConfirmToken,
      status: "Inactive",
      role: "user",
    });

    await user.save();

    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email/${emailConfirmToken}`;
    await sendEmail(
      email,
      "Confirm your Cinema account",
      `
      <p>Hello ${firstName || ""},</p>
      <p>Please confirm your email by clicking the link below:</p>
      <a href="${confirmUrl}">${confirmUrl}</a>
      <p>If you didn't register, ignore this email.</p>
    `
    );

    return res.status(201).json({ message: "Registration successful. Please check your email to confirm." });
  } catch (err) {
    console.error("[register]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ========================= CONFIRM EMAIL ========================= */
router.get("/confirm-email/:token", async (req, res) => {
  try {
    const user = await User.findOne({ emailConfirmToken: req.params.token });
    if (!user) return res.status(404).json({ error: "Invalid token" });

    user.status = "Active";
    user.emailConfirmToken = undefined;
    await user.save();

    return res.redirect(`${process.env.FRONTEND_URL}/email-confirmed`);
  } catch (err) {
    console.error("[confirm-email]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ========================= LOGIN ========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    if (user.status !== "Active") return res.status(403).json({ error: "Please confirm your email" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    // IMPORTANT: match server.js middleware (id, role), not sub
    const token = jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ========================= LOGOUT ========================= */
router.post("/logout", (req, res) => {
  // stateless JWT — frontend should discard the token
  return res.json({ message: "Logged out" });
});

/* ========================= FORGOT PASSWORD ========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    // Avoid user enumeration: always return success, only send email if user exists
    const user = await User.findOne({ email });
    if (user) {
      const token = generateToken();
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
      await sendEmail(email, "Reset your password", `<p>Click <a href="${resetUrl}">${resetUrl}</a> to reset your password (1 hour)</p>`);
    }
    return res.json({ message: "If that email exists, we'll send a reset link." });
  } catch (err) {
    console.error("[forgot-password]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ========================= RESET PASSWORD ========================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Missing token or password" });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 👇 Invalidate all previously issued JWTs
    user.passwordChangedAt = new Date();

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await sendEmail(user.email, "Password changed", "<p>Your password was changed successfully.</p>");

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
