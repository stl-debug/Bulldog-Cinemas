const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  description: { type: String, required: true },
  discountType: { type: String, enum: ["PERCENT", "FIXED"], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true }
});

module.exports = mongoose.model("Promotion", promotionSchema);
