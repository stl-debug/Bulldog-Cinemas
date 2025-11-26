const mongoose = require("mongoose");
require("dotenv").config();

const Showtime = require("./src/models/Showtime");

async function reseedAllShowtimes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Drop all indexes to avoid unique constraint issues
    try {
      await Showtime.collection.dropIndexes();
      console.log("Dropped all indexes");
    } catch (err) {
      console.log("No indexes to drop");
    }

    // Movie IDs for "Currently Running" movies
    const movieIds = [
      "68d2db401cee7877bd44744c", // La La Land
      "68d2db401cee7877bd447450", // The Lion King
      "68d2db401cee7877bd447454", // Moana
      "68d5d2391fdcc47dc9673cb4", // Inception
      "69178859470a179e929097b5", // Minions
      "69247862c9c0be756f73d7d4"  // Finding Nemo
    ];

    const movieTitles = {
      "68d2db401cee7877bd44744c": "La La Land",
      "68d2db401cee7877bd447450": "The Lion King",
      "68d2db401cee7877bd447454": "Moana",
      "68d5d2391fdcc47dc9673cb4": "Inception",
      "69178859470a179e929097b5": "Minions",
      "69247862c9c0be756f73d7d4": "Finding Nemo"
    };

    // Generate seats for a typical auditorium (6 rows x 8 seats)
    const generateSeats = () => {
      const seats = [];
      const rows = ["A", "B", "C", "D", "E", "F"];
      for (let row of rows) {
        for (let num = 1; num <= 8; num++) {
          seats.push({
            row,
            number: num,
            status: "available"
          });
        }
      }
      return seats;
    };

    // Clear existing showtimes
    await Showtime.deleteMany({});
    console.log("Cleared existing showtimes");

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    const times = [
      { hours: 14, minutes: 0 }, // 2:00 PM
      { hours: 17, minutes: 0 }, // 5:00 PM
      { hours: 20, minutes: 0 }  // 8:00 PM
    ];

    let showtimesCreated = 0;

    // Create showtimes for each movie, each day, each time
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      for (const movieId of movieIds) {
        for (const time of times) {
          const date = new Date(todayString);
          date.setDate(date.getDate() + dayOffset);
          date.setHours(time.hours, time.minutes, 0, 0);

          const showtime = new Showtime({
            movie: movieId,
            movieTitle: movieTitles[movieId],
            showroom: "Auditorium 1",
            auditoriumID: "Aud1",
            startTime: date,
            layoutVersion: 1,
            layoutChecksum: "",
            seats: generateSeats()
          });

          try {
            await showtime.save();
            showtimesCreated++;
            console.log(`Created showtime for ${movieTitles[movieId]} on ${date.toLocaleString()}`);
          } catch (err) {
            console.error(`Error creating showtime for ${movieTitles[movieId]}: ${err.message}`);
          }
        }
      }
    }

    // Re-create indexes
    await Showtime.collection.createIndex({ movie: 1, startTime: 1 });
    await Showtime.collection.createIndex({ theatre: 1, auditoriumID: 1, startTime: 1 }, { unique: true, sparse: true });
    await Showtime.collection.createIndex({ showroom: 1, startTime: 1 }, { unique: true, partialFilterExpression: { theatre: null } });
    console.log("Re-created indexes");

    console.log(`\nTotal showtimes created: ${showtimesCreated}`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

reseedAllShowtimes();
