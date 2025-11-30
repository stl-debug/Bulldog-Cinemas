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
    paymentLast4: String, 

    // NEW FIELDS
    ticketCount: { type: Number },              
    ageCategories: [{ type: String }],          

    // store which promo was used
    appliedPromoCode: { type: String }
  },
  {
    collection: "bookings",
    timestamps: true // adds createdAt, updatedAt
  }
);

// Index for finding bookings by user and showtime
BookingSchema.index({ user: 1, showtime: 1 });

// ensures a user can only use a promo once
BookingSchema.index({ user: 1, appliedPromoCode: 1 });

module.exports = mongoose.model("Booking", BookingSchema);

