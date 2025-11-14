// src/models/Booking.js
const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    // tie every booking to a user
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    showtime: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime", required: true, index: true },

    movieTitle: String,
    theatreName: String,
    showroom: String,
    startTime: Date,

    seats: [{ row: String, number: Number }],
    total: Number,
    paymentLast4: String, // safe metadata only

    // NEW FIELDS
    ticketCount: { type: Number },               // how many tickets this booking is for
    ageCategories: [{ type: String }]            // e.g. ["Adult", "Adult", "Child"]
  },
  {
    collection: "bookings",
    timestamps: true // adds createdAt, updatedAt
  }
);

module.exports = mongoose.model("Booking", BookingSchema);
