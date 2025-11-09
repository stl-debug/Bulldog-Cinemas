const mongoose = require('mongoose');

const ShowtimeSchema = new mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  showroom: { type: String, required: true },
  date: { type: Date, required: true },
  capacity: { type: Number, required: true },
  bookedSeats: { type: Number, default: 0 }
});

module.exports = mongoose.model('Showtime', ShowtimeSchema);