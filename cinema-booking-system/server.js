// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const Movie = require("./src/models/Movie"); // your Movie schema
const app = express();

app.use(cors());
app.use(express.json());

// Default showtimes if a movie has none
const DEFAULT_SHOWTIMES = [
  { time: "2:00 PM" },
  { time: "5:00 PM" },
  { time: "8:00 PM" },
];

// Connect to CES database
mongoose
  .connect(
    "mongodb+srv://sareoungly:4050CES@4050ces.c2vmult.mongodb.net/CES",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/api/movies", async (req, res) => {
  try {
    const movies = await Movie.find({}).lean();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get a single movie by ID
app.get("/api/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).lean();
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    movie.showtimes = movie.showtimes && movie.showtimes.length ? movie.showtimes : DEFAULT_SHOWTIMES;
    res.json(movie);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new movie (optional for testing)
app.post("/api/movies", async (req, res) => {
  try {
    const newMovie = new Movie(req.body);
    await newMovie.save();
    res.status(201).json(newMovie);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

mongoose.connection.once("open", async () => {
  console.log("MongoDB connected to CES database");

  const count = await Movie.countDocuments();
  console.log("Movies in DB:", count);
});

app.get("/api/test", (req, res) => {
    res.send("API is working");
});


// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

