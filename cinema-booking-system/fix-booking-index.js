// fix-booking-index.js
// Drop the old unique index that's causing conflicts
require("dotenv").config();
const mongoose = require("mongoose");

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Drop the problematic index
    const db = mongoose.connection.db;
    await db.collection("bookings").dropIndex("showtime_1_seats.row_1_seats.number_1");
    console.log("✅ Dropped old unique index on bookings");

    // Create new index for user-showtime lookups
    await db.collection("bookings").createIndex({ user: 1, showtime: 1 });
    console.log("✅ Created new index: user + showtime");

    console.log("\n✅ Index fix complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

fixIndex();
