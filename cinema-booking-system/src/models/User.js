const mongoose = require("mongoose");
const { Schema } = mongoose;
const bcrypt = require("bcrypt");


const PaymentCardSchema = new mongoose.Schema({
    cardNumberEncrypted: {type: String, required: true},
    last4: {type: String, required: true},
    cardHolderName: String,
    expiryMonth: String,
    expiryYear: String,
})

const AddressSchema = new mongoose.Schema({
    line1: String,
    line2: String,
    city: String,
    state: String,
    zip: String,
    country: String,
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  firstName: String,
  lastName: String,
  status: { type: String, enum: ["Active", "Inactive"], default: "Inactive" }, 
  promotions: { type: Boolean, default: false },
  addresses: { type: [AddressSchema], default: [] },
  paymentCards: { type: [PaymentCardSchema], default: [] }, 
  emailConfirmToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  role: { type: String, enum: ["user","admin"], default: "user" },
});

module.exports = mongoose.model("User", UserSchema);
