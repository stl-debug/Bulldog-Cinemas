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
const Showtime = require("./src/models/Showtime");
const Promotion = require("./src/models/Promotion");
const Theatre = require("./src/models/Theatre");
const Booking = require("./src/models/Booking");

const { encryptText } = require("./src/utils/crypto");
const crypto = require("crypto");
const { randomUUID } = require("crypto");

const checksum = (str) => crypto.createHash("sha1").update(str).digest("hex");
const asObjectId = (v) => new mongoose.Types.ObjectId(String(v));

const app = express();

/* ------------------------------- Middleware -------------------------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());

/* --------------------------------- Email ----------------------------------- */
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
      <ul>${changes.map((c) => `<li>${c}</li>`).join("")}</ul>
      <p>If you did not make these changes, please contact support immediately.</p>
    `;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: "Profile Update Notification",
      html,
    });
  } catch (err) {
    console.error("Error sending profile update email:", err);
  }
}

/* -------------------------------- Database --------------------------------- */
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

/* ------------------------------ Small helpers ------------------------------ */
async function cleanupExpiredHolds(showtimeId) {
  const now = new Date();
  await Showtime.updateOne(
    { _id: showtimeId },
    {
      $set: {
        "seats.$[s].status": "available",
        "seats.$[s].heldBy": null,
        "seats.$[s].heldUntil": null,
      },
    },
    { arrayFilters: [{ "s.status": "held", "s.heldUntil": { $lte: now } }] }
  );
}

/* --------------------------------- Movies ---------------------------------- */
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
    const m = new Movie(req.body);
    await m.save();
    res.status(201).json(m);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* --------- Dates & showtimes for a movie (for UI step 1 → step 2) ---------- */
app.get("/api/movies/:movieId/show-dates", async (req, res) => {
  try {
    const { movieId } = req.params;
    const dates = await Showtime.aggregate([
      { $match: { movie: asObjectId(movieId) } },
      {
        $project: {
          d: { $dateToString: { format: "%Y-%m-%d", date: "$startTime", timezone: "UTC" } },
        },
      },
      { $group: { _id: "$d" } },
      { $sort: { _id: 1 } },
    ]);
    res.json(dates.map((d) => d._id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/movies/:movieId/showtimes", async (req, res) => {
  try {
    const { movieId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing ?date=YYYY-MM-DD" });

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const shows = await Showtime.find(
      { movie: asObjectId(movieId), startTime: { $gte: start, $lt: end } },
      { movie: 1, movieTitle: 1, theatre: 1, showroom: 1, auditoriumID: 1, startTime: 1 }
    ).sort({ startTime: 1 });

    res.json(shows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/showtime/:showtimeId", async (req, res) => {
  try {
    const s = await Showtime.findById(req.params.showtimeId).lean();
    if (!s) return res.status(404).json({ error: "Showtime not found" });
    res.json({
      _id: s._id,
      movie: s.movie,
      movieTitle: s.movieTitle,
      theatre: s.theatre,
      showroom: s.showroom,
      auditoriumID: s.auditoriumID,
      startTime: s.startTime,
      seats: s.seats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------- Auth ------------------------------------ */
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

app.get("/api/auth/confirm/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).send("User not found");
    user.status = "Active";
    await user.save();
    res.send(`<!DOCTYPE html><html><head><title>Account Confirmation</title>
      <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(180deg,#111,#440000)}.container{background:rgba(28,28,28,.95);padding:2rem 3rem;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,.4);text-align:center}h1{color:#ffd700;margin:0 0 1rem 0}p{color:#ddd;margin:.5rem 0}</style>
      </head><body><div class="container"><h1>Account Confirmation Successful!</h1>
      <p>You may close this window.</p><p>If already logged in, refresh your browser to see your updated status.</p></div></body></html>`);
  } catch {
    res.status(400).send("Invalid or expired token");
  }
});

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

// Inline auth middleware
async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Authorization" });
    const token = h.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id).select(
      "_id email role status firstName lastName passwordChangedAt promotions addresses paymentCards"
    );
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
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Profile
app.get("/api/auth/profile", auth, async (req, res) => {
  const u = req.userDoc;
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
      user.firstName = firstName; changes.push("First name updated");
    }
    if (lastName !== undefined && lastName !== user.lastName) {
      user.lastName = lastName; changes.push("Last name updated");
    }
    if (typeof promotions === "boolean" && promotions !== user.promotions) {
      user.promotions = promotions; changes.push("Promotions preference updated");
    }
    if (password) {
      if (!oldPassword) return res.status(400).json({ error: "Old password is required to change password" });
      const valid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Incorrect old password" });
      user.passwordHash = await bcrypt.hash(password, 10);
      user.passwordChangedAt = new Date();
      changes.push("Password updated");
    }
    if (address !== undefined) {
      user.addresses = [address];
      changes.push("Address updated");
    }

    await user.save();
    if (changes.length > 0) await sendProfileUpdateEmail(user.email, changes);

    res.json({ message: "Profile updated", changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------ Payment cards ------------------------------ */
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

app.delete("/api/payment-cards/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const card = (user.paymentCards || []).find((c) => String(c._id) === String(req.params.id));
    if (!card) return res.status(404).json({ error: "Card not found" });

    const last4 = card.last4;
    user.paymentCards = (user.paymentCards || []).filter((c) => String(c._id) !== String(req.params.id));
    await user.save();

    await sendProfileUpdateEmail(user.email, [`Card ending in ${last4} removed`]);
    res.json({ message: "Card removed" });
  } catch (err) {
    console.error("Error sending card remove email:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------- Addresses -------------------------------- */
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

/* ------------------------- Admin: create a showtime ------------------------- */
app.post("/api/showtimes", async (req, res) => {
  try {
    const { movieId, theatreId, auditoriumID, startTime, showroom } = req.body;
    if (!movieId || !theatreId || !auditoriumID || !startTime) {
      return res.status(400).json({ error: "movieId, theatreId, auditoriumID, startTime are required" });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ error: "Movie not found" });

    const theatre = await Theatre.findById(theatreId).lean();
    if (!theatre) return res.status(404).json({ error: "Theatre not found" });

    const aud = (theatre.auditoriums || []).find((a) => a.auditoriumID === auditoriumID);
    if (!aud) return res.status(404).json({ error: "Auditorium not found in theatre" });

    const conflict = await Showtime.findOne({
      theatre: theatre._id,
      auditoriumID,
      startTime: new Date(startTime),
    });
    if (conflict) return res.status(400).json({ error: "This auditorium is already booked at that time." });

    const seats = (aud.seats || []).map((s) => ({ row: s.rowLabel, number: s.seatNumber, status: "available" }));
    if (seats.length === 0) return res.status(400).json({ error: "No seats defined for this auditorium" });

    const showtime = new Showtime({
      movie: movie._id,
      movieTitle: movie.title,
      theatre: theatre._id,
      showroom: showroom || aud.audName || auditoriumID,
      auditoriumID,
      startTime: new Date(startTime),
      layoutVersion: aud.layoutVersion || 1,
      layoutChecksum: checksum(JSON.stringify(aud.seats || [])),
      seats,
    });

    await showtime.save();
    res.status(201).json(showtime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/showtimes/:id", async (req, res) => {
  const showtimes = await Showtime.find({ movie: req.params.id });
  res.json(showtimes);
});

/* --------------------------- Seat hold / purchase --------------------------- */
// Hold seats (requires auth)
app.post("/api/showtime/:id/hold", auth, async (req, res) => {
  try {
    const { seats, minutes = 10 } = req.body || {};
    if (!Array.isArray(seats) || seats.length === 0)
      return res.status(400).json({ error: "seats[] required" });

    const showtimeId = req.params.id;
    await cleanupExpiredHolds(showtimeId);

    const holdId = randomUUID();
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    const held = [];
    for (const s of seats) {
      const updated = await Showtime.findOneAndUpdate(
        {
          _id: showtimeId,
          seats: {
            $elemMatch: {
              row: s.row,
              number: s.number,
              $or: [{ status: "available" }, { status: "held", heldUntil: { $lte: new Date() } }],
            },
          },
        },
        {
          $set: {
            "seats.$.status": "held",
            "seats.$.heldBy": holdId,
            "seats.$.heldUntil": expiresAt,
          },
        },
        { new: false }
      );

      if (!updated) {
        for (const r of held) {
          await Showtime.updateOne(
            { _id: showtimeId, "seats.row": r.row, "seats.number": r.number, "seats.heldBy": holdId },
            {
              $set: {
                "seats.$.status": "available",
                "seats.$.heldBy": null,
                "seats.$.heldUntil": null,
              },
            }
          );
        }
        return res.status(409).json({ error: `Seat ${s.row}${s.number} unavailable` });
      }
      held.push({ row: s.row, number: s.number });
    }

    res.status(201).json({ holdId, expiresAt, seats: held });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Release a hold (requires auth)
app.delete("/api/showtime/:id/hold/:holdId", auth, async (req, res) => {
  try {
    const { id, holdId } = req.params;
    await Showtime.updateOne(
      { _id: id },
      {
        $set: {
          "seats.$[h].status": "available",
          "seats.$[h].heldBy": null,
          "seats.$[h].heldUntil": null,
        },
      },
      { arrayFilters: [{ "h.heldBy": holdId }] }
    );
    res.json({ released: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purchase seats (requires auth) — booking tied to logged-in user
app.post("/api/showtime/:id/purchase", auth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { holdId, seats, total = 0, paymentLast4 = "" } = req.body || {};
    if (!holdId || !Array.isArray(seats) || seats.length === 0)
      return res.status(400).json({ error: "holdId and seats[] required" });

    const showtimeId = req.params.id;
    await cleanupExpiredHolds(showtimeId);

    session.startTransaction();

    // Mark each seat SOLD if it's still held by this hold and not expired
    for (const s of seats) {
      const ok = await Showtime.findOneAndUpdate(
        {
          _id: showtimeId,
          seats: {
            $elemMatch: {
              row: s.row,
              number: s.number,
              status: "held",
              heldBy: holdId,
              heldUntil: { $gt: new Date() },
            },
          },
        },
        {
          $set: {
            "seats.$.status": "sold",
            "seats.$.heldBy": null,
            "seats.$.heldUntil": null,
          },
        },
        { new: false, session }
      );
      if (!ok) {
        await session.abortTransaction();
        return res.status(409).json({ error: `Seat ${s.row}${s.number} not held (or hold expired)` });
      }
    }

    const st = await Showtime.findById(showtimeId).session(session);
    if (!st) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Showtime not found" });
    }

    const userId = asObjectId(req.user.id);

    const [booking] = await Booking.create(
      [
        {
          user: userId,
          showtime: st._id,
          movieTitle: st.movieTitle,
          theatreName: String(st.theatre),
          showroom: st.showroom,
          startTime: st.startTime,
          seats,
          total,
          paymentLast4,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({ message: "Purchased", bookingId: booking._id });
  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// List the logged-in user's bookings (explicit ObjectId)
app.get("/api/my/bookings", auth, async (req, res) => {
  try {
    const userId = asObjectId(req.user.id);
    const list = await Booking.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------- Promotions ------------------------------- */
app.post("/api/promotions", async (req, res) => {
  try {
    const { code, discount, startDate, endDate } = req.body;
    if (!code || !discount || !startDate || !endDate)
      return res.status(400).json({ error: "All fields required." });

    const promo = new Promotion({ code, discount, startDate, endDate });
    await promo.save();
    res.status(201).json(promo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/promotions/send", async (req, res) => {
  try {
    const { code } = req.body;
    const promo = await Promotion.findOne({ code });
    if (!promo) return res.status(404).json({ error: "Promotion not found" });

    const users = await User.find({ promotions: true });
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    for (const u of users) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: u.email,
        subject: "New Promotion from Bulldog Cinemas!",
        html: `
          <h2>🎉 ${promo.code} - ${promo.discount}% OFF</h2>
          <p>Valid from ${promo.startDate.toDateString()} to ${promo.endDate.toDateString()}</p>
        `,
      });
    }

    res.json({ message: "Promotions sent successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------- Misc ------------------------------------ */
app.post("/api/auth/logout", (_req, res) => res.json({ message: "Logged out" }));
app.get("/api/test", (_req, res) => res.send("API is working"));

/* --------------------------------- Start ----------------------------------- */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
