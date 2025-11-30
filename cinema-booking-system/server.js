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
const Booking = require("./src/models/Booking");
const Promotion = require("./src/models/Promotion");
const { encryptText } = require("./src/utils/crypto"); 

const app = express();
//

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

async function sendBookingConfirmationEmail(userId, booking) {
  try {
    const user = await User.findById(userId).lean();
    if (!user || !user.email) {
      console.warn("No email for user, skipping booking confirmation email");
      return;
    }

    const transporter = makeTransport();

    const dt = booking.startTime ? new Date(booking.startTime) : null;
    const showtimeStr = dt
      ? dt.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "Unknown showtime";

    const seatList = (booking.seats || [])
      .map((s) => `${s.row}${s.number}`)
      .join(", ");

    const ticketCount =
      booking.ticketCount || (booking.seats ? booking.seats.length : 0);

    const html = `
      <h2>Your Bulldog Cinemas Booking is Confirmed</h2>
      <p>Hi ${user.firstName || ""},</p>
      <p>Thank you for your purchase. Here are your booking details:</p>
      <ul>
        <li><strong>Movie:</strong> ${booking.movieTitle || "Movie"}</li>
        <li><strong>Theatre:</strong> ${booking.theatreName || "Bulldog Cinemas"} ${
          booking.showroom ? `– Showroom ${booking.showroom}` : ""
        }</li>
        <li><strong>Showtime:</strong> ${showtimeStr}</li>
        <li><strong>Seats:</strong> ${seatList || "N/A"}</li>
        <li><strong>Tickets:</strong> ${ticketCount}</li>
      </ul>
      <p>Enjoy your movie!</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Your Bulldog Cinemas Booking Confirmation",
      html,
    });

    console.log("✅ Booking confirmation email sent to", user.email);
  } catch (err) {
    console.error("Error sending booking confirmation email:", err);
  }
}

// DB 
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Movies
app.get("/api/movies", async (_req, res) => {
  try {
    const movies = await Movie.find({}).lean();
    // Don't embed showtimes here - let frontend fetch from /api/showtimes
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get("/api/movies/:id", async (req, res) => {
  try {
    const movieID = req.params.id;
    console.log("GET /api/movies/:id - Received ID:", movieID);

    // Fetch the movie
    const movie = await Movie.findById(movieID).lean();
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    // Fetch showtimes from DB (use 'new' with ObjectId) - sorted by startTime
    const showtimes = await Showtime.find({ movie: new mongoose.Types.ObjectId(movieID) })
      .sort({ startTime: 1 })
      .lean();
    console.log(`Found ${showtimes.length} showtimes for movie ${movieID}`);

    // Map to desired format
    const liveShowtimes = showtimes.map(s => {
      // Handle both old format (date field) and new format (startTime field)  
      const timeValue = s.startTime || s.date;
      
      const showObj = {
        _id: s._id.toString(), // Explicitly convert ObjectId to string
      };
      
      if (!timeValue) {
        showObj.time = 'No Time Set';
        showObj.showroom = s.showroom;
        showObj.capacity = s.capacity || 100;
        showObj.bookedSeats = s.bookedSeats || 0;
        return showObj;
      }
      
      const timeDate = new Date(timeValue);
      
      showObj.time = !isNaN(timeDate.getTime()) ? timeDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York',
      }) : 'Invalid Date';
      showObj.showroom = s.showroom;
      showObj.capacity = s.capacity || 100;
      showObj.bookedSeats = s.bookedSeats || 0;
      
      return showObj;
    });

    // Overwrite embedded showtimes
    movie.showtimes = liveShowtimes;
    console.log("Returning movie with showtimes:", movie.showtimes);

    res.json(movie);

  } catch (err) {
    console.error(err);
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

// Delete movie
app.delete("/api/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }
    // Also delete associated showtimes
    await Showtime.deleteMany({ movie: req.params.id });
    res.json({ message: "Movie deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dates that have showtimes for a movie
app.get("/api/movies/:movieId/show-dates", async (req, res) => {
  try {
    const { movieId } = req.params;
    const dates = await Showtime.aggregate([
      { $match: { movie: new mongoose.Types.ObjectId(movieId) } },
      { $project: { d: { $dateToString: { format: "%Y-%m-%d", date: "$startTime", timezone: "UTC" } } } },
      { $group: { _id: "$d" } },
      { $sort: { _id: 1 } }
    ]);
    res.json(dates.map(d => d._id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get showtime by ID (booking page)
app.get("/api/showtimes/by-id/:id", async (req, res) => {
  try {
    const showtime = await Showtime.findById(req.params.id).lean();
    if (!showtime) {
      return res.status(404).json({ error: "Showtime not found" });
    }
    res.json(showtime);
  } catch (err) {
    console.error("Error fetching showtime:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Check seat availability for a showtime (pre-check before payment)
app.post("/api/showtimes/:id/check-seats", async (req, res) => {
  try {
    const { id } = req.params;
    const { seats } = req.body;
    if (!Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ ok: false, error: "No seats provided" });
    }

    const s = await Showtime.findById(id).lean();
    if (!s) return res.status(404).json({ ok: false, error: "Showtime not found" });

    const soldSet = new Set(
      (s.seats || [])
        .filter(x => x.status === "sold")
        .map(x => `${x.row}${x.number}`)
    );

    const requested = seats.map(seat => `${seat.row}${seat.number}`);
    const conflicts = requested.filter(code => soldSet.has(code));

    if (conflicts.length > 0) {
      return res.status(200).json({ ok: false, conflicts });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error in check-seats:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Showtimes for a specific date (movie page → time buttons)
// Get all showtimes for a movie
app.get("/api/showtimes/:movieId", async (req, res) => {
  try {
    const { movieId } = req.params;
    const shows = await Showtime.find(
      { movie: movieId },
      { movie: 1, movieTitle: 1, theatre: 1, showroom: 1, auditoriumID: 1, startTime: 1, _id: 1 }
    ).sort({ startTime: 1 }).lean();

    res.json(shows);
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
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);

    const shows = await Showtime.find(
      { movie: movieId, startTime: { $gte: start, $lt: end } },
      { movie: 1, movieTitle: 1, theatre: 1, showroom: 1, auditoriumID: 1, startTime: 1 }
    ).sort({ startTime: 1 });

    res.json(shows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Booking page needs the seat map
app.get("/api/showtime/:showtimeId", async (req, res) => {
  try {
    const { showtimeId } = req.params;
    console.log("GET /api/showtime/:showtimeId - Received ID:", showtimeId);
    
    if (!showtimeId || showtimeId === "undefined") {
      console.log("Invalid showtimeId - returning 400");
      return res.status(400).json({ error: "Invalid showtimeId" });
    }
    
    // Validate if it's a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
      console.log("Invalid ObjectId format - returning 400");
      return res.status(400).json({ error: "Invalid showtimeId format" });
    }
    
    console.log("Fetching showtime from DB...");
    const s = await Showtime.findById(showtimeId).lean();
    console.log("Fetched showtime:", JSON.stringify(s, null, 2));
    
    if (!s) {
      console.log("Showtime not found - returning 404");
      return res.status(404).json({ error: "Showtime not found" });
    }
    
    console.log("Building response object...");
    const response = {
      _id: s._id ? s._id.toString() : 'NO_ID',
      movie: s.movie ? s.movie.toString() : null,
      movieTitle: s.movieTitle || 'Unknown',
      theatre: s.theatre ? s.theatre.toString() : null,
      showroom: s.showroom || 'Unknown',
      auditoriumID: s.auditoriumID || 'Unknown',
      startTime: s.startTime || s.date,
      seats: s.seats || [],
      date: s.date,
    };
    console.log("Returning response:", JSON.stringify(response, null, 2));
    res.json(response);
  } catch (err) {
    console.error("Error in GET /api/showtime/:showtimeId - Full error:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// POST /api/bookings - Create a new booking
app.post("/api/bookings", async (req, res) => {
  try {
    const { user, showtime, seats, movieTitle, ticketCount, ageCategories, total, paymentLast4, promoCode } = req.body;
    console.log("POST /api/bookings - Creating booking with:", { user, showtime, seats, movieTitle, ticketCount, ageCategories, total, paymentLast4, promoCode });

    // Validate required fields
    if (!user || !showtime || !seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: "Missing required fields: user, showtime, seats" });
    }

    // Get the showtime to access theatre info and current seat statuses
    const showtimeData = await Showtime.findById(showtime);
    if (!showtimeData) {
      return res.status(404).json({ error: "Showtime not found" });
    }

    // CHECK: Validate that the user hasn't already booked these seats for this showtime
    const existingBookings = await Booking.find({
      showtime: showtime,
      seats: { $elemMatch: { $or: seats } }
    });

    if (existingBookings.length > 0) {
      const bookedSeats = [];
      for (const booking of existingBookings) {
        for (const seat of booking.seats) {
          if (seats.some(s => s.row === seat.row && s.number === seat.number)) {
            bookedSeats.push(`${seat.row}${seat.number}`);
          }
        }
      }
      console.log("Already booked seats:", bookedSeats);
      return res.status(409).json({ error: `Seat(s) ${bookedSeats.join(", ")} are already booked for this showtime. Please select different seats.` });
    }

    if (promoCode) {
  const alreadyUsed = await Booking.findOne({
    user,
    appliedPromoCode: promoCode
  });

  if (alreadyUsed) {
    return res
      .status(400)
      .json({ error: "You have already used this promo code." });
  }
}

    // Create the booking
    const booking = new Booking({
      user,
      showtime,
      movieTitle: movieTitle || showtimeData.movieTitle,
      theatreName: showtimeData.theatre,
      showroom: showtimeData.showroom,
      startTime: showtimeData.startTime || showtimeData.date,
      seats,
      ticketCount,
      ageCategories,
      total: typeof total === "number" ? total : undefined,
      paymentLast4: paymentLast4 || undefined,
      appliedPromoCode: promoCode || undefined
    });

    await booking.save();
    console.log("Booking created successfully:", booking._id);

    // Mark seats as sold in the showtime
    console.log("BEFORE UPDATE - Seats to mark as sold:", seats);
    const updatedSeats = showtimeData.seats.map(seat => {
      const isBooked = seats.some(s => s.row === seat.row && s.number === seat.number);
      if (isBooked) {
        console.log(`Marking ${seat.row}${seat.number} as sold (was ${seat.status})`);
        // Return a properly structured seat object
        return {
          row: seat.row,
          number: seat.number,
          status: "sold",
          heldBy: seat.heldBy || null,
          heldUntil: seat.heldUntil || null
        };
      }
      return {
        row: seat.row,
        number: seat.number,
        status: seat.status,
        heldBy: seat.heldBy || null,
        heldUntil: seat.heldUntil || null
      };
    });

    console.log("Updating showtime with new seats...");
    const updatedShowtime = await Showtime.findByIdAndUpdate(
      showtime,
      { seats: updatedSeats },
      { new: true }
    );

    console.log("AFTER UPDATE - Seat statuses:", updatedShowtime.seats.map(s => `${s.row}${s.number}:${s.status}`));

        // send and forget confirmation email but don't block the response
    sendBookingConfirmationEmail(user, booking).catch(err => {
      console.error("Error triggering booking confirmation email:", err);
    });

    res.status(201).json({
      success: true,
      bookingId: booking._id,
      message: "Booking created successfully",
      booking
    });

    res.status(201).json({
      success: true,
      bookingId: booking._id,
      message: "Booking created successfully",
      booking
    });
  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).json({ error: "Failed to create booking. Please try again." });
  }
});

// GET /api/auth/orders - get bookings for the logged-in user
app.get("/api/auth/orders", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const orders = bookings.map((b) => ({
      id: b._id,
      movieTitle: b.movieTitle,
      theatreName: b.theatreName,
      showroom: b.showroom,
      startTime: b.startTime,
      seats: (b.seats || []).map((s) => `${s.row}${s.number}`),
      total: b.total,                 // may be undefined for older bookings, that's fine
      paymentLast4: b.paymentLast4,   // may be undefined
      ticketCount: b.ticketCount,
      ageCategories: b.ageCategories,
      createdAt: b.createdAt,
    }));

    res.json({ orders });
  } catch (err) {
    console.error("Error loading order history:", err);
    res.status(500).json({ error: "Failed to load order history" });
  }
});



// DEBUG: Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
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

    // Block login for users who have not confirmed their email yet
    if (user.status !== "Active") {
      return res.status(403).json({
        error: "Account not verified. Please check your email for the confirmation link before logging in."
      });
    }


    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, status: user.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resend confirmation email
app.post("/api/auth/resend-confirmation", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status === "Active") {
      return res.status(400).json({ error: "Account already verified" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    await sendConfirmationEmail(email, token);
    res.json({ message: "Confirmation email resent" });
  } catch (err) {
    console.error("Error resending confirmation email:", err);
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


app.post("/api/showtimes", async (req, res) => {
  try {
    const movieId = req.body.movieId || req.body.movieID;
    const theatreId = req.body.theatreId || req.body.theatre;
    const auditoriumID = req.body.auditoriumID;
    const startTime = req.body.startTime;
    const showroom = req.body.showroom;
    
    console.log('Received parameters:', { movieId, theatreId, auditoriumID, startTime, showroom });
    
    // Check if we have the minimum required fields for legacy format
    if (!movieId || !showroom || !startTime) {
      return res.status(400).json({ error: "movieId (or movieID), showroom, and startTime are required" });
    }
    
    // If we have theatreId and auditoriumID, use new format with Theatre model
    if (theatreId && auditoriumID) {
      console.log('Using new format with Theatre model');
      
      const movie = await Movie.findById(movieId);
      if (!movie) return res.status(404).json({ error: "Movie not found" });

      const Theatre = require("./src/models/Theatre");
      const theatre = await Theatre.findById(theatreId).lean();
      if (!theatre) return res.status(404).json({ error: "Theatre not found" });

      const aud = (theatre.auditoriums || []).find(a => a.auditoriumID === auditoriumID);
      if (!aud) return res.status(404).json({ error: "Auditorium not found in theatre" });

      // prevent double-booking same auditorium/time
      const conflict = await Showtime.findOne({
        theatre: theatre._id,
        auditoriumID,
        startTime: new Date(startTime)
      });
      if (conflict) return res.status(400).json({ error: "This auditorium is already booked at that time." });

      const seats = (aud.seats || []).map(s => ({ row: s.rowLabel, number: s.seatNumber, status: "available" }));
      if (seats.length === 0) return res.status(400).json({ error: "No seats defined for this auditorium" });

      const showtime = new Showtime({
        movie: movie._id,
        movieTitle: movie.title,
        theatre: theatre._id,
        showroom: showroom || aud.audName || auditoriumID,
        auditoriumID,
        startTime: new Date(startTime),
        layoutVersion: aud.layoutVersion || 1,
        layoutChecksum: require("crypto").createHash("sha1").update(JSON.stringify(aud.seats || [])).digest("hex"),
        seats
      });

      await showtime.save();
      return res.status(201).json(showtime);
    }
    
    // Legacy format - just movieID, showroom, startTime
    console.log('Using legacy format');
    
    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ error: "Movie not found" });

    const showtimeDate = new Date(startTime);
    
    // Check for conflicts in same showroom at same time
    // The unique index is on showroom + startTime (not date)
    const conflict = await Showtime.findOne({ 
      showroom,
      startTime: showtimeDate,
      theatre: null // Only check legacy format showtimes
    });
    
    if (conflict) {
      console.log('Conflict found:', {
        conflictId: conflict._id,
        conflictShowroom: conflict.showroom,
        conflictStartTime: conflict.startTime,
        newStartTime: showtimeDate
      });
      return res.status(400).json({ error: "There is already a showtime in this showroom at this time." });
    }

    const showtime = new Showtime({
      movie: movieId,
      movieTitle: movie.title,
      theatre: null,
      showroom,
      auditoriumID: auditoriumID || showroom, 
      startTime: showtimeDate,
      layoutVersion: req.body.layoutVersion || 1,
      layoutChecksum: req.body.layoutChecksum || "",
      seats: []
    });

    await showtime.save();
    res.status(201).json(showtime);
    
  } catch (err) {
    console.error('Error creating showtime:', err);
    
    // Handle duplicate key error from old index
    if (err.code === 11000) {
      if (err.message.includes('showroom_1_date_1')) {
        return res.status(400).json({ 
          error: "Duplicate showtime detected. Please drop the old 'showroom_1_date_1' index from MongoDB, or ensure there are no existing showtimes with null date values for this showroom." 
        });
      }
      return res.status(400).json({ error: "There is already a showtime in this showroom at this time." });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Bulk add showtimes over a date range
app.post("/api/showtimes/bulk", async (req, res) => {
  try {
    const { movieId, theatreId, auditoriumID, showroom, startDate, endDate, times } = req.body || {};

    if (!movieId) return res.status(400).json({ error: "movieId is required" });
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
    if (!Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ error: "times array (e.g., [\"14:00\",\"17:00\"]) is required" });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ error: "Movie not found" });

    // Parse dates as UTC days
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid startDate or endDate" });
    }
    if (end < start) return res.status(400).json({ error: "endDate must be on or after startDate" });

    // Build seats depending on format
    let seatTemplate = [];
    if (theatreId && auditoriumID) {
      const Theatre = require("./src/models/Theatre");
      const theatre = await Theatre.findById(theatreId).lean();
      if (!theatre) return res.status(404).json({ error: "Theatre not found" });
      const aud = (theatre.auditoriums || []).find(a => a.auditoriumID === auditoriumID);
      if (!aud) return res.status(404).json({ error: "Auditorium not found in theatre" });
      seatTemplate = (aud.seats || []).map(s => ({ row: s.rowLabel, number: s.seatNumber, status: "available" }));
      if (seatTemplate.length === 0) return res.status(400).json({ error: "No seats defined for this auditorium" });
    } else {
      if (!showroom) return res.status(400).json({ error: "showroom is required when theatreId/auditoriumID not provided" });
      const rows = "ABCDEFGHIJ";
      for (let r = 0; r < rows.length; r++) {
        for (let n = 1; n <= 10; n++) {
          seatTemplate.push({ row: rows[r], number: n, status: "available" });
        }
      }
    }

    let created = 0;
    const createdIds = [];
    const createdTimes = [];

    // Iterate dates inclusive
    const day = new Date(start);
    while (day <= end) {
      for (const t of times) {
        const [hh, mm] = String(t).split(":");
        const y = day.getUTCFullYear();
        const m = String(day.getUTCMonth() + 1).padStart(2, "0");
        const d = String(day.getUTCDate()).padStart(2, "0");
  // Build ISO with fixed -05:00 offset to keep times as intended locally
  const isoWithOffset = `${y}-${m}-${d}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-05:00`;
  const startTime = new Date(isoWithOffset);

        // Check duplicates
        const dupQuery = {
          movie: movie._id,
          startTime,
        };
        if (theatreId && auditoriumID) {
          dupQuery.theatre = undefined; // theatre-based showtimes have theatre set; legacy uses null
          dupQuery.auditoriumID = auditoriumID;
        } else {
          dupQuery.theatre = null;
          dupQuery.showroom = showroom;
        }

        const exists = await Showtime.findOne(dupQuery).lean();
        if (exists) {
          continue;
        }

        const showtimeDoc = {
          movie: movie._id,
          movieTitle: movie.title,
          startTime,
          seats: seatTemplate.map(s => ({ ...s })),
          layoutVersion: 1,
          layoutChecksum: "",
        };
        if (theatreId && auditoriumID) {
          showtimeDoc.theatre = theatreId;
          showtimeDoc.auditoriumID = auditoriumID;
          showtimeDoc.showroom = showroom || auditoriumID;
        } else {
          showtimeDoc.theatre = null;
          showtimeDoc.auditoriumID = showroom;
          showtimeDoc.showroom = showroom;
        }

        const st = new Showtime(showtimeDoc);
        await st.save();
        created++;
        createdIds.push(st._id);
        createdTimes.push(startTime.toISOString());
      }
      day.setUTCDate(day.getUTCDate() + 1);
    }

    res.json({ message: "Bulk showtimes created", created, ids: createdIds, times: createdTimes });
  } catch (err) {
    console.error("Error in /api/showtimes/bulk:", err);
    res.status(500).json({ error: err.message });
  }
});


// Delete showtime (must come before GET to avoid route conflicts)
app.delete("/api/showtimes/:id", async (req, res) => {
  try {
    const showtimeId = req.params.id;
    console.log('DELETE /api/showtimes/:id - Received ID:', showtimeId);
    
    // Check if ID is valid MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
      return res.status(400).json({ error: "Invalid showtime ID format" });
    }
    
    const showtime = await Showtime.findByIdAndDelete(showtimeId);
    if (!showtime) {
      console.log('Showtime not found with ID:', showtimeId);
      return res.status(404).json({ error: "Showtime not found" });
    }
    
    console.log('Showtime deleted successfully:', showtimeId);
    res.json({ message: "Showtime deleted successfully" });
  } catch (err) {
    console.error('Error deleting showtime:', err);
    res.status(500).json({ error: err.message });
  }
});

// get showtimes by movie ID
app.get("/api/showtimes/:id", async (req, res) => {
  const showtimes = await Showtime.find({movie: req.params.id});
  res.json(showtimes);
});

// get all promotions
app.get("/api/promotions", async (req, res) => {
  try {
    const promotions = await Promotion.find({}).lean();
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete promotion
app.delete("/api/promotions/:id", async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) {
      return res.status(404).json({ error: "Promotion not found" });
    }
    res.json({ message: "Promotion deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create promotion
app.post("/api/promotions", async (req, res) => {
  try {
    console.log('Raw request body:', req.body);
    const { _id, description, discountType, discountValue, validFrom, validTo } = req.body;
    console.log('Extracted fields:', { _id, description, discountType, discountValue, validFrom, validTo });
    
    // Validate required fields - be more lenient with types
    if (!_id || String(_id).trim() === '') {
      console.log('Validation failed: _id');
      return res.status(400).json({ error: "Promotion code (_id) is required." });
    }
    if (!description || String(description).trim() === '') {
      console.log('Validation failed: description');
      return res.status(400).json({ error: "Description is required." });
    }
    if (!discountType || (discountType !== 'PERCENT' && discountType !== 'FIXED')) {
      console.log('Validation failed: discountType', discountType);
      return res.status(400).json({ error: "Valid discount type (PERCENT or FIXED) is required." });
    }
    if (discountValue === undefined || discountValue === null || discountValue === '') {
      console.log('Validation failed: discountValue', discountValue);
      return res.status(400).json({ error: "Discount value is required." });
    }
    if (!validFrom) {
      console.log('Validation failed: validFrom');
      return res.status(400).json({ error: "Valid from date is required." });
    }
    if (!validTo) {
      console.log('Validation failed: validTo');
      return res.status(400).json({ error: "Valid to date is required." });
    }
    
    const numValue = Number(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      console.log('Validation failed: discountValue not a positive number', numValue);
      return res.status(400).json({ error: "Discount value must be a positive number." });
    }
    
    console.log('All validations passed, proceeding...');

    // Check if promotion with this ID already exists
    const existing = await Promotion.findById(_id);
    if (existing) {
      return res.status(400).json({ error: "A promotion with this code already exists." });
    }

    let validFromDate, validToDate;
    try {
      validFromDate = new Date(validFrom);
      validToDate = new Date(validTo);
    } catch (err) {
      return res.status(400).json({ error: "Invalid date format." });
    }
    
    if (isNaN(validFromDate.getTime())) {
      return res.status(400).json({ error: `Invalid 'Valid From' date: ${validFrom}` });
    }
    if (isNaN(validToDate.getTime())) {
      return res.status(400).json({ error: `Invalid 'Valid To' date: ${validTo}` });
    }

    const promo = new Promotion({ 
      _id, 
      description, 
      discountType, 
      discountValue: numValue, 
      validFrom: validFromDate, 
      validTo: validToDate 
    });
    await promo.save();
    console.log('Promotion saved successfully:', promo);
    res.status(201).json(promo);
  } catch (err) {
    console.error('Error creating promotion:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send email to subscribed users
app.post("/api/promotions/send", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Promotion code required" });
    const promo = await Promotion.findById(code);
    if (!promo) return res.status(404).json({ error: "Promotion not found" });

    const users = await User.find({ promotions: true });
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const discountText = promo.discountType === "PERCENT" 
      ? `${promo.discountValue}% OFF` 
      : `$${promo.discountValue} OFF`;

    for (const u of users) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: u.email,
        subject: "New Promotion from Bulldog Cinemas!",
        html: `
          <h2>🎉 ${promo._id} - ${discountText}</h2>
          <div style="background-color: #333; color: #fff; padding: 15px; border-radius: 5px;">
            <p style="color: #fff; margin: 0;">${promo.description}</p>
          </div>
          <p>Valid from ${new Date(promo.validFrom).toDateString()} to ${new Date(promo.validTo).toDateString()}</p>
        `
      });
    }

    res.json({ message: "Promotions sent successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validate a promo code and return discount info
app.post("/api/promotions/validate", async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ error: "Promotion code is required." });
    }

    // Codes are stored as _id in Promotion, usually uppercase
    const promo = await Promotion.findById(String(code).toUpperCase());
    if (!promo) {
      return res.status(404).json({ error: "Invalid promotion code." });
    }

    const now = new Date();
    if (promo.validFrom && promo.validFrom > now) {
      return res.status(400).json({ error: "This promotion is not yet valid." });
    }
    if (promo.validTo && promo.validTo < now) {
      return res.status(400).json({ error: "This promotion has expired." });
    }

    return res.json({
      ok: true,
      code: promo._id,
      discountType: promo.discountType,  // "PERCENT" or "FIXED"
      discountValue: promo.discountValue,
      description: promo.description,
    });
  } catch (err) {
    console.error("Error validating promotion:", err);
    res.status(500).json({ error: "Failed to validate promotion code." });
  }
});

//Misc
app.post("/api/auth/logout", (_req, res) => res.json({ message: "Logged out" }));
app.get("/api/test", (_req, res) => res.send("API is working"));

//Start
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));