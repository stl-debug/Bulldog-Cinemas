const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
  code: { type: String, required: true },
  discount: { type: Number, required: true, min: 0, max: 100 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
});

module.exports = mongoose.model("Promotion", promotionSchema);
