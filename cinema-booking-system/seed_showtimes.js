const mongoose = require("mongoose");
require("dotenv").config();

const Showtime = require("./src/models/Showtime");

async function seedShowtimes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

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

    // Create showtimes for today and next few days at various times
    // Use local time by getting the string and parsing back (avoiding timezone issues)
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Get YYYY-MM-DD
    
    const times = [
      { hours: 14, minutes: 0 }, // 2:00 PM
      { hours: 17, minutes: 0 }, // 5:00 PM
      { hours: 20, minutes: 0 }  // 8:00 PM
    ];

    // Clear existing showtimes
    await Showtime.deleteMany({});
    console.log("Cleared existing showtimes");

    let showtimesCreated = 0;

    // Create showtimes for each movie, each day, each time
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {  // Extended to 7 days
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
            // Ignore duplicate errors
            if (err.code === 11000) {
              console.log(`Skipped duplicate showtime for ${movieTitles[movieId]}`);
            } else {
              console.error(`Error creating showtime: ${err.message}`);
            }
          }
        }
      }
    }

    console.log(`\nTotal showtimes created: ${showtimesCreated}`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

seedShowtimes();
