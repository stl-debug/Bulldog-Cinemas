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

app.use(cors());
app.use(express.json());

// Default showtimes
const DEFAULT_SHOWTIMES = [
  { time: "2:00 PM" },
  { time: "5:00 PM" },
  { time: "8:00 PM" },
];

// Connect to CES database
mongoose
  .connect(
    "mongodb+srv://sareoungly:4050CES@4050ces.c2vmult.mongodb.net/CES",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/api/movies", async (req, res) => {
  try {
    const movies = await Movie.find({}).lean();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get a single movie by ID
app.get("/api/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).lean();
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    movie.showtimes = movie.showtimes && movie.showtimes.length ? movie.showtimes : DEFAULT_SHOWTIMES;
    res.json(movie);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new movie (testing)
app.post("/api/movies", async (req, res) => {
  try {
    const newMovie = new Movie(req.body);
    await newMovie.save();
    res.status(201).json(newMovie);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

mongoose.connection.once("open", async () => {
  console.log("MongoDB connected to CES database");

  const count = await Movie.countDocuments();
  console.log("Movies in DB:", count);
});

app.get("/api/movies", async (req, res) => {
  try {
    const movies = await Movie.find({}).lean();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------- User / Auth Routes ------------------- */

// send confirmation email
async function sendConfirmationEmail(userEmail, token) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const url = `${process.env.CLIENT_URL}/confirm/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: "Confirm your account",
    html: `Click <a href="${url}">here</a> to confirm your account.`
  });
}

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, promotions } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      passwordHash: hashedPassword,
      promotions,
      status: "Inactive",
      role: "user" // default
    });

    await newUser.save();

    // Generate confirmation token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Send confirmation email
    await sendConfirmationEmail(email, token);

    res.status(201).json({ message: "User registered. Please confirm your email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm email
app.get("/api/auth/confirm/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.status = "Active";
    await user.save();

    res.json({ message: "Account confirmed. You can now log in." });
  } catch (err) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "Active") return res.status(403).json({ error: "Please confirm your email" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit profile (authenticated)
app.put("/api/auth/profile/:id", async (req, res) => {
  try {
    const { firstName, lastName, password, promotions } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (password) user.password = await bcrypt.hash(password, 10);
    if (promotions !== undefined) user.promotions = promotions;

    await user.save();
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout (just client-side token removal)
app.post("/api/auth/logout", (req, res) => {
  res.json({ message: "Logged out" });
});


app.get("/api/test", (req, res) => {
    res.send("API is working");
});


// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

