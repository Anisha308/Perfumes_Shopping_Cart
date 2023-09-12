const admin = require("../models/adminmodel");
const User = require("../models/usermodel");
const Order = require("../models/ordermodel");
const Coupon = require("../models/couponmodel");
const Category = require("../models/categorymodel");
const Chart = require("chart.js");

const bcrypt = require("bcrypt");

//load login page

const loadlogin = async (req, res) => {
  try {
    res.render("adminlogin");
  } catch (error) {
    console.log(error.message);
  }
};

const verifyadminLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const adminData = await admin.findOne({ email: email });
    if (adminData.password === password) {
      if (adminData) {
        req.session.admin_id = adminData._id;
        res.redirect("/dashboard");
      } else {
        res.render("adminlogin", { message: "email or password is incorrect" });
      }
    } else {
      res.render("adminlogin", { message: "Email and password is incorrect" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadHome = async (req, res) => {
  try {
    const isAuthenticated = true;

    if (isAuthenticated) {
      const users = await User.find(); // Modify this query based on your database schema
      res.render("adminhome", { user: users });
    } else {
      // If the user is not authenticated, redirect to the 'adminlogin' page
      res.redirect("/adminlogin");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const ITEMS_PER_PAGE = 10; // Number of items to show per page

const loadUser = async (req, res) => {
  try {
    const currentPage = req.query.page || 1; // Get the current page from the query parameter
    const search = req.query.search || "";

    const totalUsers = await User.countDocuments({
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
        { mobile: { $regex: ".*" + search + ".*" } },
      ],
    });

    const userData = await User.find({
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
        { mobile: { $regex: ".*" + search + ".*" } },
      ],
    })
      .skip((currentPage - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render("adminhome", {
      user: userData,
      currentPage,
      hasNextPage: ITEMS_PER_PAGE * currentPage < totalUsers,
      hasPrevPage: currentPage > 1,
      nextPage: currentPage + 1,
      prevPage: currentPage - 1,
      totalPages: Math.ceil(totalUsers / ITEMS_PER_PAGE),
      search,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const adminlogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/adminlogin");
  } catch (error) {
    console.log(error.message);
  }
};

//blockuser

const blockUser = async (req, res) => {
  try {
    const id = req.query.id;
    await User.findByIdAndUpdate({ _id: id }, { $set: { is_blocked: true } });
    // req.session.destroy()
    res.redirect("/loadUser");
  } catch (error) {
    console.log(error.message);
  }
};

const unBlockUser = async (req, res) => {
  try {
    const id = req.query.id;
    await User.findByIdAndUpdate({ _id: id }, { $set: { is_blocked: false } });
    res.redirect("/loadUser");
  } catch (error) {
    console.log(error.message);
  }
};

const loadDashboard = async (req, res) => {
  try {
    // const preDate = "";
    // const postDate = "";
    // const order_data = await Order.find()
    //   .populate("user")
    //   .populate("items.product")
    // .populate("items.stock");
    const userId = req.session?.user?.id;
    const user = await User.findById(userId);
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setMilliseconds(endOfDay.getMilliseconds() - 1);

    const orders = await Order.find(); // Fetching all orders from the database

    // Extracting necessary data for the chart
    const salesData = orders.map((order) => ({
      createdAt: order.createdAt.toISOString().split("T")[0], // Extracting date only
      total: order.total,
    }));

    // Calculating the total sales for each date
    const salesByDate = salesData.reduce((acc, curr) => {
      acc[curr.createdAt] = (acc[curr.createdAt] || 0) + curr.total;
      return acc;
    }, {});

    // Converting the sales data into separate arrays for chart labels and values
    const chartLabels = Object.keys(salesByDate);
    const chartData = Object.values(salesByDate);

    const todaySales = await Order.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    const totalsales = await Order.countDocuments({ status: "Delivered" });

    const todayRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          payment_method: { $in: ["razorpay", "cash on delivery"] },
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
    ]);

    const revenue = todayRevenue.length > 0 ? todayRevenue[0].totalRevenue : 0;

    const TotalRevenue = await Order.aggregate([
      {
        $match: { status: "Delivered" },
      },
      { $group: { _id: null, Revenue: { $sum: "$total" } } },
    ]);

    const Revenue = TotalRevenue.length > 0 ? TotalRevenue[0].Revenue : 0;

    const Orderpending = await Order.countDocuments({ status: "Pending" });
    const OrderReturn = await Order.countDocuments({
      status: "Returned",
    });
    const Ordershipped = await Order.countDocuments({ status: "Shipped" });
    const OrderRefunted = await Order.countDocuments({ status: "Refunded" });

    const Ordercancelled = await Order.countDocuments({
      status: "cancelled",
    });

    const salesCountByMonth = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          count: 1,
        },
      },
    ]);

    res.render("dashboard", {
      user,
      todaySales,
      totalsales,
      revenue,
      Revenue,
      Orderpending,
      Ordershipped,
      Ordercancelled,
      OrderRefunted,
      salesCountByMonth,
      OrderReturn,
      chartLabels: JSON.stringify(chartLabels),
      chartData: JSON.stringify(chartData),
      order_data: orders,
      preDate: startOfDay.toISOString().split("T")[0], // Update preDate and postDate
      postDate: endOfDay.toISOString().split("T")[0],
    });
  } catch (err) {
    res.status(500).send(err.message); // Send error response with status code 500
  }
};

const salesreport = async (req, res) => {
  try {
    const preDate = "";
    const postDate = "";
    const order_data = await Order.find()
      .populate("user")
      .populate("items.product")
      .populate("items.quantity");
    res.render("salesreport", { order_data, preDate, postDate });
  } catch (err) {
    res.status(500).send(err.message); // Send error response with status code 500
  }
};

// get products
const find_coupon = async (req, res) => {
  try {
    const coupon_data = await Coupon.find().exec();

    res.render("coupon", {
      coupon_data,
    });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};

const addcouponpage = async (req, res) => {
  try {
    const data = await Category.find();

    res.render("addCoupon", { data });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const addcoupon = async (req, res) => {
  try {
    const couponInput = req.body.coupon.trim();
    const offer = req.body.offer;

    if (offer > 50 || !offer) {
      res.render("addCoupon", {
        data,
        msg: "Offer cannot be greater than 50",
      });
    } else if (couponInput === "") {
      res.render("addCoupon", { data, msg: "Coupon name cannot be empty" });
    } else {
      const cou = await Coupon.find();
      const couponExists = cou.some((item) => item.coupon === req.body.coupon);

      if (couponExists) {
        const data = await Category.find();
        res.render("addCoupon", { data, msg: "coupon already exists" });
      } else {
        const coupon = new Coupon({
          coupon: couponInput,
          expiryDate: req.body.expiryDate,
          offer: req.body.offer,
        });

        const savedCoupon = await coupon.save();
        const user_id = req.session.user?.id;

        // Find the user
        const user = await User.findById(user_id);

        if (!user) {
          return res.json({
            status: "error",
            message: "User not found",
          });
        }

        // // Add the coupon name to the user's coupons array
        // user.coupons.push(savedCoupon.coupon);

        // Save the user with the updated coupons array
        await user.save();
        res.redirect("/coupons");
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        err.message || "Some error occurred while creating a create operation",
    });
  }
};

const editcoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    const category = await Category.find();

    if (!coupon) {
      return res.redirect("/coupons");
    }

    return res.render("update_coupon", { coupon, category });
  } catch (err) {
    console.error(err);
    return res.redirect("/productList");
  }
};

const updatecoupon = async (req, res) => {
  try {
    const { id } = req.params;

    // Update the coupon using findByIdAndUpdate
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      {
        coupon: req.body.coupon,
        category: req.body.category,
        expiryDate: req.body.expiryDate,
        offer: req.body.offer,
      },

      { new: true }
    );

    // Set { new: true } to return the updated document

    if (updatedCoupon) {
      req.session.message = {
        type: "success",
        message: "User update successful",
      };
      req.session.authorized = true;
      res.redirect("/coupons");
    } else {
      // Product not found
      req.session.message = {
        type: "error",
        message: "Product not found",
      };
      res.redirect("/coupons");
    }
  } catch (error) {
    console.error(error);
    res.send(error);
  }
};

const deletecoupon = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Coupon.findByIdAndRemove(id);

    if (result) {
      // Check if user was found and removed
      res.redirect("/coupons");
    } else {
      res.redirect("/coupons");
    }
  } catch (err) {
    res.status(500).send(err.message); // Send error response with status code 500
  }
};

module.exports = {
  loadlogin,
  verifyadminLogin,
  loadDashboard,
  loadHome,
  loadUser,
  adminlogout,
  blockUser,
  unBlockUser,
  salesreport,
  find_coupon,
  addcouponpage,
  addcoupon,
  editcoupon,
  updatecoupon,
  deletecoupon,
};
