const mongoose = require("mongoose");

var couponSchema = new mongoose.Schema({
  coupon: {
    type: String,
    require: true,
  },
  category: {
    type: String,
    require: true,
  },
  expiryDate: {
    type: String,
    require: true,
  },
  offer: {
    type: Number,
    require: true,
  },
});

const Coupon = new mongoose.model("coupon", couponSchema);

module.exports = Coupon;
