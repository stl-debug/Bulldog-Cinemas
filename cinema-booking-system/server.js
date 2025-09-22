const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Movie = require('./src/models/Movie');
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(
  "mongodb+srv://sareoungly:4050CES@4050ces.c2vmult.mongodb.net/",
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.get("/movies", async (req, res) => {
  try {
    const { search = "", genre = "" } = req.query;

    // Build query
    const q = {};
    if (search) {
      q.title = { $regex: search, $options: "i" };
    }
    if (genre) {
      q.genre = genre;
    }

    const movies = await Movie.find(q).lean();
    // ensure showtimes fallback
    const normalized = movies.map(m => ({
      ...m,
      showtimes: (m.showtimes && m.showtimes.length) ? m.showtimes : DEFAULT_SHOWTIMES
    }));

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).lean();
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    movie.showtimes = (movie.showtimes && movie.showtimes.length) ? movie.showtimes : DEFAULT_SHOWTIMES;
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new movie
app.post("/movies", async (req, res) => {
  try {
    const payload = req.body;
    const newMovie = new Movie(payload);
    await newMovie.save();
    res.status(201).json(newMovie);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

