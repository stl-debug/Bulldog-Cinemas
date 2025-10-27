// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

const Movie = require("./src/models/Movie");
const User = require("./src/models/User");

const app = express();

/* ------------------- Middleware ------------------- */
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

/* ------------------- Database Connection ------------------- */
mongoose.connect(
  process.env.MONGO_URI,
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

/* ------------------- Email Helpers ------------------- */
async function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Send confirmation email
async function sendConfirmationEmail(userEmail, token) {
  const transporter = await createTransporter();
  const url = `${process.env.BACKEND_URL}/api/auth/confirm/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: "Confirm your account",
    html: `Click <a href="${url}">here</a> to confirm your account.`
  });
}

// Send password reset email
async function sendPasswordResetEmail(userEmail, token) {
  const transporter = await createTransporter();
  const url = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: "Reset your password",
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${url}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });
}

/* ------------------- Movie Routes ------------------- */
app.get("/api/movies", async (req, res) => {
  try {
    const movies = await Movie.find({}).lean();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).lean();
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/movies", async (req, res) => {
  try {
    const newMovie = new Movie(req.body);
    await newMovie.save();
    res.status(201).json(newMovie);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------- Auth Routes ------------------- */
// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, promotions } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      passwordHash: hashedPassword,
      promotions,
      status: "Inactive",
      role: "user"
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    await sendConfirmationEmail(email, token);

    res.status(201).json({ message: "User registered. Please confirm your email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email confirmation
app.get("/api/auth/confirm/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).send("User not found");

    user.status = "Active";
    await user.save();

    res.redirect(`${process.env.FRONTEND_URL}/confirmed`);
  } catch (err) {
    res.status(400).send("Invalid or expired token");
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "Active") return res.status(403).json({ error: "Please confirm your email" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot password
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: "Password reset email sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and password are required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.resetPasswordToken !== token) return res.status(400).json({ error: "Invalid reset token" });
    if (user.resetPasswordExpires < new Date()) return res.status(400).json({ error: "Reset token has expired" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.passwordHash = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    if (err.name === "JsonWebTokenError") return res.status(400).json({ error: "Invalid reset token" });
    if (err.name === "TokenExpiredError") return res.status(400).json({ error: "Reset token has expired" });
    res.status(500).json({ error: err.message });
  }
});

// Profile update
app.put("/api/auth/profile/:id", async (req, res) => {
  try {
    const { firstName, lastName, password, promotions } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (password) user.passwordHash = await bcrypt.hash(password, 10);
    if (promotions !== undefined) user.promotions = promotions;

    await user.save();
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.json({ message: "Logged out" });
});

// Test route
app.get("/api/test", (req, res) => {
  res.send("API is working");
});

/* ------------------- Server Start ------------------- */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
