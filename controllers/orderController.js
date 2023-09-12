const Order = require("../models/ordermodel");
const Cart = require("../models/cartmodel");
const Product = require("../models/productmodel");
const Address = require("../models/addressmodell");
const User = require("../models/usermodel");
const Coupon = require("../models/couponmodel");
const Razorpay = require("razorpay");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpay = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const { ObjectId } = require("mongodb");
const {
  UserBindingContextImpl,
} = require("twilio/lib/rest/chat/v2/service/user/userBinding");

const placeOrder = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    // Receive the payment_method and addressId from the frontend form
    const { selectedPaymentMethod, selectedAddressId } = req.body;

    const addressSchema = await Address.findOne({ user: userId });

    const deliveryAddress = addressSchema.deliveryAddress;
    if (!deliveryAddress || !Array.isArray(deliveryAddress)) {
      throw new Error("User address data is invalid.");
    }

    const addressIndex = deliveryAddress.findIndex(
      (item) => item._id.toString() === selectedAddressId
    );

    if (addressIndex === -1) {
      throw new Error("Address not found for the given user and id.");
    }

    const address = deliveryAddress[addressIndex];

    const cart = await Cart.findOne({ userId: userId }).populate(
      "products.productId"
    );
    const items = cart.products.map((item) => {
      const product = item.productId;
      const quantity = item.quantity;
      const price = product.price;
      if (!price) {
        throw new Error("Product price is required");
      }
      if (!product) {
        throw new Error("Product is required");
      }
      return {
        product: product._id,
        quantity: quantity,
        price: price,
      };
    });

    items.forEach(async (item) => {
      const pro = await Product.findById(item.product);
      const quan = pro.stock - item.quantity; //
      await Product.findByIdAndUpdate(item.product, { stock: quan });
    });

    let totalPrice = cart.total - cart.discount;
    const order = new Order({
      user: userId,
      items: items,
      total: totalPrice,
      status: "Pending",
      payment_method: selectedPaymentMethod,
      createdAt: new Date(),
      address: address,
    });

    await order.save();
    if (selectedPaymentMethod === "cash on delivery") {
      await Cart.deleteOne({ userId: userId });
      res.render("confirm", { user: req.session.user });
    } else if (selectedPaymentMethod === "razorpay") {
      const options = {
        amount: totalPrice * 100, // Amount in paise (Indian currency)
        currency: "INR",
        receipt: userId,
      };
      const order = await razorpay.orders.create(options);
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//order page in admin side
const ITEMS_PER_PAGE = 10; // Number of orders to show per page

const order_status = async (req, res) => {
  try {
    const currentPage = req.query.page || 1; // Get the current page from the query parameter
    const totalOrders = await Order.countDocuments({});

    const order_data = await Order.find()
      .populate("user")
      .populate("items.product")
      .populate("items.quantity")
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .skip((currentPage - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render("order_admstatus", {
      order_data,
      currentPage,
      hasNextPage: ITEMS_PER_PAGE * currentPage < totalOrders,
      hasPrevPage: currentPage > 1,
      nextPage: currentPage + 1,
      prevPage: currentPage - 1,
      totalPages: Math.ceil(totalOrders / ITEMS_PER_PAGE),
      user: req.session.user, // Pass the user object to the view
    });
  } catch (error) {
    console.log(error.message);
  }
};

const refundOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = "Refunded";
    await Order.findByIdAndUpdate(orderId, { status: newStatus });
    const order = await Order.findById(orderId);
    const user = await User.findById(order.user);

    const refundedAmount = order.total;
    user.wallet += refundedAmount;
    await user.save();
    // const wallet = user.totalWallet + order.total;
    // user.wallet.push(order.total);
    // user.totalWallet = wallet;
    await user.save();
    res.json({
      success: true,
      message: "Order refunded successfully.",
      user: req.session.user,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, error: error.message, user: req.session.user });
  }
};

// order adminupdate
const orderUpdate = async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status;

    // Update the order using findByIdAndUpdate
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: newStatus } },
      { new: true } // Return the updated document
    );

    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "Order status updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// const cancelOrder = async (req, res) => {
//   try {
//     const orderId = req.params.id;
//     const cancelReason = req.body.cancelReason;
//     // Find the order by ID
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found." });
//     }

//     // Update the order status to "Cancelled"
//     await Order.findByIdAndUpdate(orderId, {
//       status: "Cancelled",
//       cancelReason: cancelReason,
//     });

//     // Iterate through the items in the canceled order and increase stock
//     for (const item of order.items) {
//       const productId = item.product;
//       const quantity = item.quantity;

//       // Find the product and increase its stock
//       const product = await Product.findById(productId);
//       if (product) {
//         product.stock += quantity;
//         await product.save();
//       }
//     }
//     res
//       .status(200)
//       .json({ success: true, message: "Order cancelled successfully." });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

const ITEMS_PER_PAGE_ORDERS = 10; // You can adjust this value as needed

const order_List = async (req, res) => {
  try {
    const User = req.session.user;
    const userId = req.session?.user?.id;
    const page = +req.query.page || 1;

    const totalOrders = await Order.countDocuments({ user: userId });

    const order_data = await Order.find({ user: userId })
      .populate("items.product")
      .populate("items.quantity")
      .skip((page - 1) * ITEMS_PER_PAGE_ORDERS)
      .limit(ITEMS_PER_PAGE_ORDERS);

    res.render("orderlist", {
      User,
      order_data,
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE_ORDERS * page < totalOrders,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      ITEMS_PER_PAGE_ORDERS,
    });
  } catch (error) {
    console.log(error.message);
  }
};

//order  user update
const UserorderUpdate = async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status;
    const newExpiry = req.body.expiry; // Assuming you have a field named 'expiry' in your request body

    // Update the order using findByIdAndUpdate
    await Order.findByIdAndUpdate(orderId, {
      status: newStatus,
      expiry: newExpiry,
    });

    res.redirect("/UserorderUpdate");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

//usercancelorder
const cancelUserOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    // Retrieve the products and quantities from the order
    const orderItems = order.items;
    // Update the stock levels for each product
    for (const item of orderItems) {
      const productId = item.product; // Use item.product as the reference to the product
      const quantity = parseInt(item.quantity, 10); // Ensure quantity is a number
      
      // Retrieve the product by ID
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found." });
      }

      // Increase the product's stock level
      product.stock += quantity;

      // Save the updated product
      await product.save();
    }

    // Update the order status to "Cancelled"
    await Order.findByIdAndUpdate(orderId, { status: "Cancelled" });

    res
      .status(200)
      .json({ success: true, message: "Order cancelled successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const createOrder = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    // Receive the payment_method and addressId from the frontend form
    const { selectedPaymentMethod, selectedAddressId } = req.body;

    const cart = await Cart.findOne({ userId: userId }).populate(
      "products.productId"
    );
    const items = cart.products.map((item) => {
      const product = item.productId;
      const quantity = item.quantity;
      const price = product.price;
      if (!price) {
        throw new Error("Product price is required");
      }
      if (!product) {
        throw new Error("Product is required");
      }
      return {
        product: product._id,
        quantity: quantity,
        price: price,
      };
    });

    items.forEach(async (item) => {
      const pro = await Product.findById(item.product);
      const quan = pro.quantity - item.quantity;
      await Product.findByIdAndUpdate(item.product, { quantity: quan });
    });

    let totalPrice = cart.total;
    const order = new Order({
      user: userId,
      items: items,
      total: totalPrice,
      status: "Pending",
      payment_method: selectedPaymentMethod,
      createdAt: new Date(),
    });

    let options = {
      amount: totalPrice * 100, // amount in the smallest currency unit (example: 70000 paise = 700 INR)
      currency: "INR",
      // Add more options as needed
    };

    const orders = await razorpay.orders.create(options);
    res.status(200).json({
      success: true,
      payment: {
        order_id: order.user,
        currency: "INR",
        amount: order.total * 100,
      },
      paymentMethod: "Razorpay",
      user: req.session.user, // Pass the user object to the response
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Error creating order",
      user: req.session.user, // Pass the user object to the response
    });
  }
};
const filterorder = async (req, res) => {
  try {
    const preDate = new Date(req.body.preDate);
    const postDate = new Date(req.body.postDate);
    postDate.setDate(postDate.getDate() + 1);

    const order_data = await Order.find({
      createdAt: { $gte: preDate, $lte: postDate },
    })
      .populate("user")
      .populate("items.product")
      .populate("items.quantity");
    res.render("salesreport", {
      order_data,
      preDate: req.body.preDate,
      postDate: req.body.postDate,
    });
  } catch (error) {
    console.error(error);
    res.send(error);
  }
};

const successPage = async (req, res) => {
  try {
    res.render("confirm");
  } catch (error) {
    console.log(error.message);
  }
};

const IsOrderComplete = async (req, res) => {
  razorpay.payments
    .fetch(req.body.razorpay_payment_id)
    .then((paymentDocument) => {
      if (paymentDocument.status === "Pending") {
        res.send("payment succesfull");
      } else {
        res.redirect("/checkout");
      }
    });
};



const returnOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const returnReason = req.body.returnReason;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }
   
    if (order.returnStatus === "Delivered") {
      const deliveryDays = 7;
      const deliveredDate = new Date(); // Get the current date
      const returnExpiryDate = new Date(deliveredDate);
      returnExpiryDate.setDate(deliveredDate.getDate() + deliveryDays);
      updatedOrder.returnExpiryDate = returnExpiryDate;
    }
    if (order.returnStatus === "Returned") {
      return res
        .status(400)
        .json({ success: false, message: "Order is already returned." });
    }
    // Update the order return status, reason, and status
    order.returnStatus = "Returned";
    order.reason = returnReason;
    order.status = "Returned";

    await order.save();

    res
      .status(200)
      .json({ success: true, message: "Order returned successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};



const coupon = async (req, res) => {
  try {
    const user_id = req.session.user?.id;
    const code = req.body.coupon;

    // Find the coupon by its code
    const coupon = await Coupon.findOne({ coupon: code });

    if (!coupon) {
      return res.json({
        status: "error",
        message: "Invalid coupon",
      });
    }

    const currentDate = new Date();
    const expDate = new Date(coupon.expiryDate);

    if (currentDate > expDate) {
      return res.json({
        status: "error",
        message: "Coupon expired",
      });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.json({
        status: "error",
        message: "User not found",
      });
    }

    const couponIndex = user.coupons.findIndex((item) => item === code);

    if (couponIndex !== -1) {
      return res.json({
        status: "error",
        message: "Coupon already used",
      });
    }

    const cart = await Cart.findOne({ userId: user_id });

    if (!cart) {
      return res.json({
        status: "error",
        message: "Cart not found",
      });
    }

    // Define the minimum and maximum eligible amounts for the coupon
    const minEligibleAmount = 1000;
    const maxEligibleAmount = 10000;

    if (cart.total < minEligibleAmount) {
      return res.json({
        status: "error",
        message:
          "Cart total is below the minimum eligible amount for the coupon",
      });
    }

    if (cart.total > maxEligibleAmount) {
      return res.json({
        status: "error",
        message:
          "Cart total exceeds the maximum eligible amount for the coupon",
      });
    }

    const discount = cart.total * (coupon.offer / 100);

    await Cart.findOneAndUpdate({ userId: user_id }, { discount: discount });

    user.coupons.push(coupon.coupon);
    await user.save();

    return res.json({
      status: "success",
      message: "Coupon added",
      discount: discount.toFixed(2),
      stotal: (cart.total - discount).toFixed(2),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const cancelCoupon = async (req, res) => {
  const user_id = req.session.user?.id; // Assuming you have user sessions set up

  const code = req.body.coupon; // Get the coupon code from the request body
  try {
    const user = await User.findById(user_id);
    if (!user) {
      return res.json({
        status: "error",
        message: "User not found",
      });
    }

    const couponIndex = user.coupons.findIndex((item) => item === code);
    if (couponIndex === -1) {
      return res.json({
        status: "error",
        message: "Coupon not found in user coupons",
      });
    }

    // Remove the coupon from the user's coupons array
    user.coupons.splice(couponIndex, 1);
    await user.save();

    // Reset the cart's discount to zero (assuming you have a Cart model)
    const cart = await Cart.findOne({ userId: user_id });

    if (cart) {
      cart.discount = 0;
      await cart.save();
    }

    return res.json({
      status: "success",
      message: "Coupon canceled successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};
module.exports = {
  placeOrder,
  order_status,
  orderUpdate,

  order_List,
  UserorderUpdate,
  cancelUserOrder,
  returnOrder,
  createOrder,
  successPage,
  IsOrderComplete,
  filterorder,
  refundOrder,
  coupon,
  cancelCoupon,
};
