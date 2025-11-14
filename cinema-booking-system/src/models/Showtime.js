const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema({
  row: String,
  number: String,
  type: String,
  available: { type: Boolean, default: true }
});

const ShowtimeSchema = new mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  movieTitle: String,
  theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre' },
  showroom: { type: String, required: true },
  auditoriumID: String,
  startTime: { type: Date, required: true },
  date: { type: Date, required: true },
  capacity: { type: Number, required: true },
  bookedSeats: { type: Number, default: 0 },
  layoutVersion: { type: Number, default: 1 },
  layoutChecksum: String,
  seats: [SeatSchema]
}, { timestamps: true });

module.exports = mongoose.model('Showtime', ShowtimeSchema);