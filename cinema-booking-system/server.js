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
const { encryptText } = require("./src/utils/crypto"); 

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());

// Email Helpers
function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendConfirmationEmail(userEmail, token) {
  const transporter = makeTransport();
  const url = `${process.env.BACKEND_URL}/api/auth/confirm/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: "Confirm your account",
    html: `Click <a href="${url}">here</a> to confirm your account.`,
  });
}

async function sendPasswordResetEmail(userEmail, token) {
  const transporter = makeTransport();
  const url = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: "Reset your password",
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password (expires in 1 hour):</p>
      <p><a href="${url}">Reset Password</a></p>
    `,
  });
}

async function sendProfileUpdateEmail(userEmail, changes) {
  try {
    const transporter = makeTransport();
    const html = `
      <h2>Your profile has been updated</h2>
      <p>The following fields were changed:</p>
      <ul>
        ${changes.map(change => `<li>${change}</li>`).join('')}
      </ul>
      <p>If you did not make these changes, please contact support immediately.</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: 'Profile Update Notification',
      html,
    });

    console.log(`Profile update email sent to ${userEmail}`);
  } catch (err) {
    console.error("Error sending profile update email:", err);
  }
}


// DB 
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Movies
app.get("/api/movies", async (_req, res) => {
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

// Auth
// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, promotions } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      passwordHash,
      promotions: !!promotions,
      status: "Inactive",
      role: "user",
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    await sendConfirmationEmail(email, token);

    res.status(201).json({ message: "User registered. Please confirm your email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm email
app.get("/api/auth/confirm/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).send("User not found");
    user.status = "Active";
    await user.save();
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Account Confirmation</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(180deg, #111, #440000);
            }
            .container {
              background: rgba(28, 28, 28, 0.95);
              padding: 2rem 3rem;
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              text-align: center;
            }
            h1 {
              color: #ffd700;
              margin: 0 0 1rem 0;
            }
            p {
              color: #ddd;
              margin: 0.5rem 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Account Confirmation Successful!</h1>
            <p>You may close this window.</p>
            <p>If already logged in, refresh your browser to see your updated status.</p>
          </div>
        </body>
      </html>
    `);
  } catch {
    res.status(400).send("Invalid or expired token");
  }
});



// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, status: user.status } });
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

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordChangedAt = new Date();
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

// Inline auth middleware (uses JWT) 
async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Authorization" });
    const token = h.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET); 

    const user = await User.findById(payload.id).select("_id email role status firstName lastName passwordChangedAt promotions addresses paymentCards");
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.passwordChangedAt) {
      const issued = payload.iat * 1000;
      if (issued < user.passwordChangedAt.getTime()) {
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }
    }
    req.user = { id: String(user._id), email: user.email, role: user.role };
    req.userDoc = user; 
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Profile
app.get("/api/auth/profile", auth, async (_req, res) => {
  const u = _req.userDoc;
  res.json({
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    status: u.status,
    role: u.role,
    promotions: u.promotions,
    addresses: u.addresses || [],
  });
});


app.put("/api/auth/profile", auth, async (req, res) => {
  try {
    const { firstName, lastName, password, oldPassword, promotions, address } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let changes = [];

    if (firstName !== undefined && firstName !== user.firstName) {
      user.firstName = firstName;
      changes.push("First name updated");
    }
    if (lastName !== undefined && lastName !== user.lastName) {
      user.lastName = lastName;
      changes.push("Last name updated");
    }
    if (typeof promotions === "boolean" && promotions !== user.promotions) {
      user.promotions = promotions;
      changes.push("Promotions preference updated");
    }

    // Handle password change
    if (password) {
      if (!oldPassword) return res.status(400).json({ error: "Old password is required to change password" });
      const valid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Incorrect old password" });
      user.passwordHash = await bcrypt.hash(password, 10);
      user.passwordChangedAt = new Date();
      changes.push("Password updated");
    }

    // Handle address update
    if (address !== undefined) {
      user.addresses = [address]; // Replace existing addresses
      changes.push("Address updated");
    }

    await user.save();

    // Send notification if any changes
    if (changes.length > 0) {
      await sendProfileUpdateEmail(user.email, changes);
    }

    res.json({ message: "Profile updated", changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Payment cards (protected)
// List masked cards
app.get("/api/payment-cards", auth, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  const cards = Array.isArray(user.paymentCards) ? user.paymentCards : [];
  res.json(
    cards.map((c) => ({
      id: c._id,
      last4: c.last4,
      cardHolderName: c.cardHolderName,
      expiryMonth: c.expiryMonth,
      expiryYear: c.expiryYear,
    }))
  );
});

// Add card (encrypts PAN; stores safe metadata)
app.put("/api/payment-cards", auth, async (req, res) => {
  const { cardNumber, cardHolderName, expiryMonth, expiryYear } = req.body || {};
  if (!cardNumber || !/^\d{12,19}$/.test(String(cardNumber))) {
    return res.status(400).json({ error: "Valid cardNumber (12–19 digits) required" });
  }
  if (!expiryMonth || !expiryYear) return res.status(400).json({ error: "expiryMonth and expiryYear required" });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!Array.isArray(user.paymentCards)) user.paymentCards = [];
  if (user.paymentCards.length >= 4) return res.status(400).json({ error: "Max 4 cards allowed" });

  const last4 = String(cardNumber).slice(-4);
  const encrypted = encryptText(String(cardNumber));

  user.paymentCards.push({
    cardNumberEncrypted: encrypted,
    last4,
    cardHolderName: cardHolderName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    expiryMonth: String(expiryMonth),
    expiryYear: String(expiryYear),
  });

  await user.save();

  try {
    await sendProfileUpdateEmail(user.email, [`New card ending in ${last4} added`]);
  } catch (err) {
    console.error("Error sending card add email:", err);
  }

  res.json({ message: "Card added" });
});

// Update card (non-sensitive fields)
app.patch("/api/payment-cards/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { cardHolderName, expiryMonth, expiryYear } = req.body || {};
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const card = (user.paymentCards || []).find((c) => String(c._id) === String(id));
  if (!card) return res.status(404).json({ error: "Card not found" });

  if (cardHolderName !== undefined) card.cardHolderName = String(cardHolderName);
  if (expiryMonth !== undefined) card.expiryMonth = String(expiryMonth);
  if (expiryYear !== undefined) card.expiryYear = String(expiryYear);

  await user.save();
  res.json({ message: "Card updated" });
});

// Delete card
app.delete("/api/payment-cards/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Find the card first
    const card = (user.paymentCards || []).find((c) => String(c._id) === String(req.params.id));
    if (!card) return res.status(404).json({ error: "Card not found" });

    const last4 = card.last4;

    // Remove the card
    user.paymentCards = (user.paymentCards || []).filter((c) => String(c._id) !== String(req.params.id));
    await user.save();

    // Send email
    await sendProfileUpdateEmail(user.email, [`Card ending in ${last4} removed`]);

    res.json({ message: "Card removed" });
  } catch (err) {
    console.error("Error sending card remove email:", err);
    res.status(500).json({ error: err.message });
  }
});



//Addresses (protected) 
app.get("/api/addresses", auth, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  const list = Array.isArray(user.addresses) ? user.addresses : [];
  res.json(
    list.map((a) => ({
      id: a._id,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      zip: a.zip,
      country: a.country,
    }))
  );
});

app.put("/api/addresses", auth, async (req, res) => {
  const { line1, line2, city, state, zip, country } = req.body || {};
  if (!line1 || !city || !state || !zip || !country) {
    return res.status(400).json({ error: "line1, city, state, zip, country are required" });
  }
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!Array.isArray(user.addresses)) user.addresses = [];
  user.addresses.push({ line1, line2: line2 || "", city, state, zip, country });
  await user.save();
  res.json({ message: "Address added" });
});

app.patch("/api/addresses/:id", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const addr = (user.addresses || []).find((a) => String(a._id) === String(req.params.id));
  if (!addr) return res.status(404).json({ error: "Address not found" });

  const { line1, line2, city, state, zip, country } = req.body || {};
  if (line1 !== undefined) addr.line1 = line1;
  if (line2 !== undefined) addr.line2 = line2;
  if (city !== undefined) addr.city = city;
  if (state !== undefined) addr.state = state;
  if (zip !== undefined) addr.zip = zip;
  if (country !== undefined) addr.country = country;

  await user.save();
  res.json({ message: "Address updated" });
});

app.delete("/api/addresses/:id", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const before = (user.addresses || []).length;
  user.addresses = (user.addresses || []).filter((a) => String(a._id) !== String(req.params.id));
  if (user.addresses.length === before) return res.status(404).json({ error: "Address not found" });

  await user.save();
  res.json({ message: "Address removed" });
});

//Misc
app.post("/api/auth/logout", (_req, res) => res.json({ message: "Logged out" }));
app.get("/api/test", (_req, res) => res.send("API is working"));

//Start
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
