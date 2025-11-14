// src/models/Theatre.js
const mongoose = require("mongoose");

const SeatDefSchema = new mongoose.Schema(
  {
    seatID: { type: String, required: true },   // e.g., "A3"
    rowLabel: { type: String, required: true }, // "A"
    seatNumber: { type: Number, required: true } // 3
  },
  { _id: false }
);

const AuditoriumSchema = new mongoose.Schema(
  {
    auditoriumID: { type: String, required: true }, // "Aud1"
    audName: { type: String, required: true },      // "Auditorium 1"
    layoutVersion: { type: Number, default: 1 },    // bump if you ever change layout
    noOfSeats: { type: Number, default: 0 },
    seats: { type: [SeatDefSchema], default: [] }   // immutable layout
  },
  { _id: false }
);

const TheatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: String,
    auditoriums: { type: [AuditoriumSchema], default: [] }
  },
  { timestamps: true, collection: "theatres" }
);

module.exports = mongoose.models.Theatre || mongoose.model("Theatre", TheatreSchema);
