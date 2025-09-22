const mongoose = require("mongoose");
const ShowtimeSchema = require("./Showtime");

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  genre: { type: String, required: true },
  rating: { type: String, required: true },
  description: String,
  posterUrl: String,
  trailerUrl: String,
  status: { type: String, enum: ["Currently Running", "Coming Soon"], required: true },
  showtimes: [ShowtimeSchema]
});

module.exports = mongoose.model("Movie", MovieSchema);
