// src/models/Showtime.js
const mongoose = require("mongoose");

const ShowSeatSchema = new mongoose.Schema(
  {
    row: { type: String, required: true },      // "A"
    number: { type: Number, required: true },   // 1..N
    status: { type: String, enum: ["available", "held", "sold"], default: "available" },
    heldUntil: { type: Date },
    heldBy: { type: String }
  },
  { _id: false }
);

const ShowtimeSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
    movieTitle: { type: String, required: true }, // denormalized

    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: true },
    showroom: { type: String, required: true },   // "Auditorium 1"
    auditoriumID: { type: String, required: true }, // "Aud1"

    startTime: { type: Date, required: true, index: true },

    // snapshot metadata
    layoutVersion: { type: Number, required: true },
    layoutChecksum: { type: String }, // optional (e.g., hash of seatIDs)

    // per-showtime seat state
    seats: { type: [ShowSeatSchema], default: [] }
  },
  { timestamps: true, collection: "showtimes" }
);

// helpful indexes
ShowtimeSchema.index({ movie: 1, startTime: 1 });
ShowtimeSchema.index({ theatre: 1, auditoriumID: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.models.Showtime || mongoose.model("Showtime", ShowtimeSchema);
