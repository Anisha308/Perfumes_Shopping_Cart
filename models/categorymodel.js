const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  categoryType: {
    type: String, // e.g., "unisex", "women", etc.
  },
  discountPercentage: {
    type: Number,
  },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // Reference to the Product model
});
module.exports = mongoose.model("Category", categorySchema);
