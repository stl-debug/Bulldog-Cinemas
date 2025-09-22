const mongoose = require("mongoose");

const ShowtimeSchema = new mongoose.Schema({
  time: { type: String, required: true }
});

module.exports = ShowtimeSchema;
