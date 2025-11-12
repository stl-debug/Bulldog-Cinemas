const mongoose = require("mongoose");
const MovieSchema = new mongoose.Schema({
  title: String,
  genre: String,
  rating: String,
  description: String,
  posterUrl: String,
  trailerUrl: String,
  status: { type: String, enum: ["Currently Running", "Coming Soon"] },
  // showtimes: [{ time: String }],
  cast: [String],
  director: String,
  runtime: String,
  releaseDate: String
});

module.exports = mongoose.model("Movie", MovieSchema, "movies");
