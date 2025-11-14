// src/models/Showtime.js
const mongoose = require("mongoose");

// ---- Seat subdoc
const ShowSeatSchema = new mongoose.Schema(
  {
    row: { type: String, required: true },                 // "A"
    number: { type: Number, required: true, min: 1 },      // 1..N
    status: {
      type: String,
      enum: ["available", "held", "sold"],
      default: "available",
    },
    heldUntil: { type: Date, default: null },
    heldBy: { type: String, default: null },               // holdId (uuid or session id)
  },
  { _id: false }
);

// ---- Showtime root
const ShowtimeSchema = new mongoose.Schema(
  {
    // movie identity
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true, index: true },
    movieTitle: { type: String, required: true }, // denormalized for UI

    // where it plays
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: false },
    showroom: { type: String, required: true },        // "Auditorium 1"
    auditoriumID: { type: String, required: true },    // "Aud1"

    // when it starts
    startTime: { type: Date, required: true, index: true },

    // snapshot metadata of the auditorium layout used for this show
    layoutVersion: { type: Number, required: true, default: 1 },
    layoutChecksum: { type: String, default: "" },

    // per-showtime seat states (snapshot copied from theatre layout)
    seats: { type: [ShowSeatSchema], default: [] },
  },
  { timestamps: true, collection: "showtimes" }
);

// Helpful compound indexes
ShowtimeSchema.index({ movie: 1, startTime: 1 });
// Index for new format with theatre
ShowtimeSchema.index({ theatre: 1, auditoriumID: 1, startTime: 1 }, { unique: true, sparse: true });
// Index for legacy format without theatre
ShowtimeSchema.index({ showroom: 1, startTime: 1 }, { unique: true, partialFilterExpression: { theatre: null } });

// ------- Utilities & helpers

// Build a unique key for a seat
function seatKey(row, number) {
  return `${String(row).toUpperCase()}-${Number(number)}`;
}

// Prevent duplicate seats (same row+number) inside one showtime
ShowtimeSchema.pre("validate", function (next) {
  try {
    const seen = new Set();
    for (const s of this.seats || []) {
      const key = seatKey(s.row, s.number);
      if (seen.has(key)) {
        return next(new Error(`Duplicate seat detected: ${s.row}${s.number}`));
      }
      seen.add(key);
    }
    return next();
  } catch (e) {
    return next(e);
  }
});

// Instance helper: find index of a seat by row/number
ShowtimeSchema.methods.findSeatIndex = function (row, number) {
  const target = seatKey(row, number);
  const seats = this.seats || [];
  for (let i = 0; i < seats.length; i++) {
    if (seatKey(seats[i].row, seats[i].number) === target) return i;
  }
  return -1;
};

// Static helper: release all expired holds for a showtime
ShowtimeSchema.statics.releaseExpiredHolds = async function (showtimeId) {
  const now = new Date();
  await this.updateOne(
    { _id: showtimeId },
    {
      $set: {
        "seats.$[expired].status": "available",
        "seats.$[expired].heldBy": null,
        "seats.$[expired].heldUntil": null,
      },
    },
    {
      arrayFilters: [
        { "expired.status": "held", "expired.heldUntil": { $lte: now } },
      ],
    }
  );
};

// Export
module.exports =
  mongoose.models.Showtime || mongoose.model("Showtime", ShowtimeSchema);