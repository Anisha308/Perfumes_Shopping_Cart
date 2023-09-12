const Cart = require("../models/cartmodel");
const Product = require("../models/productmodel");
const User = require("../models/usermodel");
const Address = require("../models/addressmodell");
const Coupon = require("../models/couponmodel");
const Wishlist = require("../models/wishlistmodel");

const userCart = async (req, res) => {
  if (!req.session.user) {
    return res.render("login"); // Render the login page if user is not logged in
  }
  try {
    const userId = req.session.user.id;
    const cart = await Cart.findOne({ userId: userId }).populate(
      "products.productId"
    );

    let product = [];
    let productCount;
    if (cart) {
      productCount = cart.products.length;
      product = cart.products;

      res.render("cart", {
        products: product,
        productCount,
        cartId: cart._id,
        user: req.session.user,
      }); // Pass productCount as a local variable
    } else {
      productCount = 0;
      res.render("cart", {
        productCount,
        products: product,
        cartId: null, // No cart found, so cartId is null
        user: req.session.user, // Pass the user object to the view
      }); // Pass productCount as a local variable
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Some Error occurred");
  }
};

// Function to add an item to the cart
const addToCart = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.json({
        status: "login_required",
        message: "Please Login to add items in cart",
        user: req.session.user, // Pass the user object to the response
      });
    }
    const productId = req.params.id;
    const product_data = await Product.findById(productId);
    if (!product_data) {
      console.log("Product not found in the database.");

      return res.json({
        status: "error",
        message: "Product not found",
        user: req.session.user, // Pass the user object to the response
      });
    }
    let userCart = await Cart.findOne({ userId: userId });
    if (!userCart) {
      // If the user's cart doesn't exist, create a new cart
      userCart = new Cart({ userId: userId, products: [] });
    }

    const productIndex = userCart.products.findIndex(
      (product) => product.productId.toString() === productId
    );

    if (productIndex === -1) {
      // If the product is not in the cart, check if available stock allows adding
      if (product_data.stock > 0) {
        // Decrement product stock

        // Add the product to the cart
        userCart.products.push({ productId, quantity: 1 });

        // Save changes to cart and product
        await Promise.all([userCart.save(), product_data.save()]);

        return res.json({
          status: "success",
          message: "Added to cart",
          user: req.session.user, // Pass the user object to the response
        });
      } else {
        return res.json({
          status: "error",
          message: "Product is out of stock",
          user: req.session.user, // Pass the user object to the response
        });
      }
    } else {
      // If the product is already in the cart, increase its quantity by 1
      if (userCart.products[productIndex].quantity < product_data.stock) {
        userCart.products[productIndex].quantity += 1;
        await userCart.save();
        return res.json({
          status: "success",
          message: "Added to cart",
          user: req.session.user, // Pass the user object to the response
        });
      } else {
        return res.json({
          status: "error",
          message: "Quantity exceeds available stock",
          user: req.session.user, // Pass the user object to the response
        });
      }
    }
  } catch (error) {
    console.error(error);
    res.json({
      status: "error",
      message: "An error occurred",
      user: req.session.user, // Pass the user object to the response
    });
  }
};

const incrementQuantity = async (req, res) => {
  const { productId, cartId } = req.body;
  try {
    // Find the cart using the provided cartId and populate the product details
    let cart = await Cart.findOne({ _id: cartId }).populate({
      path: "products.productId",
      model: "Product",
    });
    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    // Find the index of the product in the cart based on the productId
    const cartIndex = cart.products.findIndex(
      (item) => item._id.toString() === productId
    );

    // Check if the product is present in the cart
    if (cartIndex === -1) {
      return res.json({
        success: false,
        message: "Product not found in the cart",
      });
    }
    const product = cart.products[cartIndex].productId;
    // Check if the quantity to increment is within the available stock
    if (cart.products[cartIndex].quantity < product.stock) {
      // Increment the product quantity and save the cart
      cart.products[cartIndex].quantity += 1;
      await cart.save();

      // Calculate the total price for the product and get the remaining quantity

      const total = cart.products[cartIndex].quantity * product.offerprice;
      const remain = product.stock - cart.products[cartIndex].quantity;

      res.json({
        success: true,
        total,
        quantity: cart.products[cartIndex].quantity,
        mess: remain > 0 ? remain : "out of stock",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to update quantity" });
  }
};

const decrementQuantity = async (req, res) => {
  const { productId, cartId } = req.body;
  try {
    const stock = req.body.quantity;
    // Find the cart using the provided cartId and populate the product details
    let cart = await Cart.findOne({ _id: cartId }).populate(
      "products.productId"
    );

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    // Find the index of the product in the cart based on the productId
    const cartIndex = cart.products.findIndex(
      (item) => item._id.toString() === productId
    );

    // Check if the product is present in the cart
    if (cartIndex === -1) {
      return res.json({
        success: false,
        message: "Product not found in the cart",
      });
    }

    // Increment the product quantity and save the cart
    cart.products[cartIndex].quantity -= 1;
    await cart.save();

    // Calculate the total price for the product and get the remaining quantity
    const product = cart.products[cartIndex].productId;
    const total = product.offerprice * cart.products[cartIndex].quantity;
    const remain = product.stock - cart.products[cartIndex].stock;
    res.json({
      success: true,
      total,
      stock: cart.products[cartIndex].stock,
      mess: remain > 0 ? remain : "out of stock",
      quantity: cart.products[cartIndex].quantity,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to update quantity" });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const productIdToDelete = req.params.productId; // Correctly get productId from URL parameter
    const userId = req.session.user?.id;

    if (!userId) {
      // Handle the case where user is not logged in
      return res.status(401).send("User not authenticated");
    }

    const cart = await Cart.findOne({ userId: userId });

    if (!cart) {
      return res.status(404).send("Cart not found");
    }
    const productIndex = cart.products.findIndex(
      (product) => product._id.toString() === productIdToDelete
    );
    if (productIndex === -1) {
      return res.status(404).send("Product not found in cart");
    }

    cart.products.splice(productIndex, 1);
    await cart.save();

    return res.status(200).send("Product Deleted");
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Internal Server Error");
  }
};

//checkout
const checkout = async (req, res) => {
  const user = req.session.user;

  try {
    const userId = req.session.user.id;
    if (!userId) {
      return res.redirect("/login");
    }

    const data = await User.findOne({ _id: userId });
    const addresses = await Address.find({ user: userId });

    const coupon = await Coupon.find();
    const address = addresses.map((addressItem) => addressItem.deliveryAddress);

    const cart = await Cart.findOne({ userId: userId }).populate(
      "products.productId"
    );
    if (!cart) {
      return res.render("cart", { user });
    }

    const items = cart.products.map((item) => {
      const product = item.productId;
      const quantity = item.quantity;
      const price = product.offerprice;
      if (!price) {
        throw new Error("product price is required");
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
    let totalPrice = 0;
    items.forEach((item) => {
      totalPrice += item.price * item.quantity;
    });
    const upcart = await Cart.findOneAndUpdate(
      { userId: userId },
      { total: totalPrice }
    );
    if (cart) {
      const products = cart.products;
      let currentDate = new Date();
      currentDate = currentDate.toISOString().substr(0, 10);

      res.render("checkout", {
        user: user, // Pass the user object to the view
        currentDate,
        upcart,
        products,
        coupon,
        // data: data.Address,
        totalPrice,
        address,
        userId: userId,
        addressItem: addresses,
      });
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  addToCart,
  userCart,
  incrementQuantity,
  decrementQuantity,
  deleteCartItem,
  checkout,
};
