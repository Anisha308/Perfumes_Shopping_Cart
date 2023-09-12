const mongoose = require("mongoose");

var addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deliveryAddress: [
      {
        name: {
          type: String,
        },

        mobile: String,
        email: String,
        address: {
          type: String,
        },

        district: {
          type: String,
        },

        state: {
          type: String,
        },

        country: {
          type: String,
        },
        pincode: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Address", addressSchema);
