const mongoose = require("mongoose");
const {
  TrustProductsEntityAssignmentsContextImpl,
} = require("twilio/lib/rest/trusthub/v1/trustProducts/trustProductsEntityAssignments");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  description: {
    type: String,
  },
  images: {
    type: Array,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  quantity: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
  },
  discount: {
    type: String,
  },
  offerprice: {
    type: Number,
  },
  discountPercentage: {
    type: Number, // Automatically fetched from the associated category
  },
  stock: {
    type: Number,
  },
  is_listed: {
    type: Boolean,
    default: true,
  },
});
productSchema.index({ name: "text", description: "text" });
module.exports = mongoose.model("Product", productSchema);
