const mongoose = require("mongoose");
require("dotenv").config();

const Booking = require("./src/models/Booking");

async function clearBookings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const result = await Booking.deleteMany({});
    console.log(`Deleted ${result.deletedCount} bookings`);

    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

clearBookings();
