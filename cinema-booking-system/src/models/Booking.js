const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // optional guest checkout
    showtime: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", required: true },
    movieTitle: String,
    theatreName: String,
    showroom: String,
    startTime: Date,
    seats: [{ row: String, number: Number }],
    total: Number,
    paymentLast4: String,        // store only safe metadata
    createdAt: { type: Date, default: Date.now }
  },
  { collection: "bookings" }
);

module.exports = mongoose.model("Booking", BookingSchema);
