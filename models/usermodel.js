const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  email: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  address: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
  ],
  is_blocked: {
    type: Number,
    required: true,
    default: false,
  },
  is_otp_verified: {
    type: Boolean,
    default: 0,
  },
  wallet: {
    type: Number,
    required: true,
    default: 0,
  },
  coupons: {
    type: [String],
  },
  referralCode: { type: String, },
});

module.exports = mongoose.model("User", userSchema);
