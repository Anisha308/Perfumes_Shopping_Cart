const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: String,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  isRefunded: {
    type: Boolean,
    default: false,
  },
  refundedAmount: {
    type: String,
    default: 0,
  },
  cancelReason: {
    type: String,
  },
  reason: {
    type: String,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: [
      "Pending",
      "Returned",
      "Refunded",
      "Shipped",
      "Delivered",
      "cancelled",
    ],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  payment_method: {
    type: String,
  },
  returnExpiryDate: {
    type: Date,
  },

  address: {
    type: Object,
    required: true,
  },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
