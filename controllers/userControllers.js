const {
  UserDefinedMessageListInstance,
} = require("twilio/lib/rest/api/v2010/account/call/userDefinedMessage");
const User = require("../models/usermodel");
const Product = require("../models/productmodel");
const Address = require("../models/addressmodell");
const Category = require("../models/categorymodel");
const bcrypt = require("bcrypt");

const Quantity = require("../models/quantitymodel");

const twilio = require("twilio");
const dotenv = require("dotenv");
dotenv.config();
const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const verifySid = process.env.verifySid;
const client = twilio(accountSid, authToken);
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const loadRegister = async (req, res) => {
  try {
    res.render("register");
  } catch (error) {
    console.log(error);
  }
};

const insertUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, mobile, referralCode } =
      req.body;
    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      return res.render("register", { message: "Email already exists" });
    }

    const spassword = await securePassword(password);

    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode: referralCode });
      if (!referrer) {
        return res.render("register", { message: "Invalid referral code" });
      }
    }

    const generatedReferralCode = await generateReferralCode();
    console.log(generatedReferralCode);
    req.session.user = {
      username: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: spassword,
      referralCode: generatedReferralCode,
    };

    if (!name || !mobile || !email || !password || !confirmPassword) {
      return res.render("register", {
        message: "All fields should be filled",
      });
    }

    if (!/^\d{10}$/.test(req.body.mobile)) {
      return res.render("register", {
        message: "Mobile number must be 10 digits",
      });
    }

    if (!/^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/.test(req.body.email)) {
      return res.render("register", { message: "Invalid email format" });
    }

    if (/\d/.test(req.body.name)) {
      return res.render("register", {
        message: "Name should not contain numbers",
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      return res.render("register", {
        message: "password must contain a mix of the following elements:At least one uppercase letter (A-Z) ,At least one lowercase letter(a- z), At least one number (0-9),At least one special character (e.g., !, @, #, $, %, ^, &, *).",
      });
    }

    const existingMobileUser = await User.findOne({ mobile: mobile });
    if (existingMobileUser) {
      return res.render("register", {
        message: "Mobile number already exists",
      });
    }

    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(req.body.mobile)) {
      return res.render("register", {
        message: "Mobile number must be 10 digits",
      });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.render("register", { message: "Passwords do not match" });
    }

    // const newUser = new User({
    //   username: name,
    //   email: email,
    //   password: spassword,
    //   mobile: mobile,
    //   referralCode: generatedReferralCode,
    // });

    // await newUser.save();

    if (referrer) {
      const referralBonus = 100; // Example referral bonus amount
      referrer.wallet += referralBonus;
      newUser.wallet += referralBonus;
      await referrer.save();
    }

    const phoneNumbers = [mobile]; // Add other phone numbers here if needed
    for (const phoneNumber of phoneNumbers) {
      const verification = await client.verify.v2
        .services(verifySid)
        .verifications.create({ to: `+91${phoneNumber}`, channel: "sms" });
    }
    res.render("verifyotp");
  } catch (error) {
    console.log(error.message);
    return res.render("register", { message: "an error occured" });
  }
};

const generateReferralCode = async (req, res) => {
  try {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let referralCode = "";
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      referralCode += characters.charAt(randomIndex);
    }
    return referralCode;
  } catch (error) {
    console.log(error.message);
    throw new Error("An error occurred while generating referral code");
  }
};

const loadVerifyOTP = async (req, res) => {
  try {
    otpTimer = req.session.otpTimer || 0; // Get the OTP timer value from the session
    res.render("verifyotp", { otpTimer }); // Pass otpTimer as a local variable to the view
  } catch (error) {
    console.log(error.message);
  }
};
// Login user method
const loginLoad = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
};

//otp timer
const startOtpTimer = (req, res, next) => {
  const otpExpiryTime = 1 * 60 * 1000; //Set OTP expiry time to 1 minutes (in milliseconds)
  // Set the OTP timer in the session
  if (!req.session.otpTimer) {
    req.session.otpTimer = otpExpiryTime;

    // Start the timer
    setTimeout(() => {
      req.session.otpTimer = undefined; // Clear the OTP timer after expiry
    }, otpExpiryTime);
  }
  next();
};

const verifyOtp = async (req, res) => {
  try {
    const otp = req.body.otp;
    const userData = req.session.user;
    const verification = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({
        to: `+91${userData.mobile}`,
        code: otp,
      });
    if (verification.status === "approved") {
      console.log("kkVerification successful!");

      req.session.user_id = req.session.user_id;
      const user = new User({
        username: userData.username,
        email: userData.email,
        mobile: userData.mobile,

        password: userData.password,
        referralCode: userData.referralCode,
      });
      req.session.user = null;

      await user.save();
      // return res.redirect('/login');
      return res.render("login", { message: "Register successful" });
    } else {
      // Incorrect OTP
      console.log("verification not success");
      return res.render("verifyotp", { message: "Incorrect OTP" });
    }
  } catch (error) {
    console.log(error.message);
    return res.render("verifyotp", { message: "An error occurred" });
  }
};

//
const resendOtp = async (req, res) => {
  try {
    const userData = req.session.user;
    if (!userData) {
      return res.status(400).json({ message: "Invalid or expired session" });
    }

    // Assuming you have already defined the `client` and `verifySid` somewhere
    const mobile = userData.mobile;
    const phoneNumbers = [mobile]; // Add other phone numbers here if needed

    for (const phoneNumber of phoneNumbers) {
      const verification = await client.verify.v2
        .services(verifySid)
        .verifications.create({ to: `+91${phoneNumber}`, channel: "sms" });
    }

    req.session.user = {
      username: userData.name,
      email: userData.email,
      mobile: userData.mobile,
      password: userData.password,
      is_admin: userData.is_admin,
      referralCode: userData.referralCode,
    };

    res.render("verifyotp", { message: "OTP resent successfully" });
  } catch (error) {
    console.log(error.message);
    return res.render("register", { message: "All fields should be filled" });
  }
};

const verifyLogin = async (req, res) => {
  try {
    console.log(req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render("login", {
        message: "Email and password should not be empty",
      });
    }

    const userData = await User.findOne({ email });

    if (!userData) {
      return res.render("login", { message: "Email or password is wrong" });
    }

    if (userData.is_blocked) {
      return res.render("login", { message: "You are blocked from this site" });
    }

    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return res.render("login", { message: "Password is wrong" });
    }

    // Store relevant user data in the session (avoid storing the password)
    req.session.user_id = userData._id;
    req.session.user = {
      id: userData._id,
      name: userData.username,
      email: userData.email,
      mobile: userData.mobile,
      // Avoid storing the password here
    };

    return res.render("home"); // Redirect to the home page after successful login
  } catch (error) {
    return res.render("login", { message: "An error occurred during login" });
  }
};

const loadHome = async (req, res) => {
  try {
    const User = req.session.user;
    const products = await Product.find({});

    res.render("home", { User, products });
  } catch (error) {
    console.log(error.message);
  }
};

const loadForgotPassword = async (req, res) => {
  try {
    res.render("forgotpassword");
  } catch (error) {
    console.log(error.message);
  }
};

const forgotVerifyNumber = async (req, res) => {
  try {
    const mobile = req.body.mobile; // Change this based on how mobile is sent in your request
    console.log(mobile, "mob");
    // Check if a mobile number is provided in the request
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Assuming you have already defined the `client` and `verifySid` somewhere
    const phoneNumbers = [mobile]; // Add other phone numbers here if needed

    for (const phoneNumber of phoneNumbers) {
      const verification = await client.verify.v2
        .services(verifySid)
        .verifications.create({ to: `+91${phoneNumber}`, channel: "sms" });
    }

    res.render("forgotOtpVerify", { mobile });
  } catch (error) {
    console.log(error.message);
  }
};

const loadOtpPage = async (req, res) => {
  try {
    otpTimer = req.session.forgotOtpTimer || 0; // Get the OTP timer value from the session
    res.render("forgotOtpVerify", { otpTimer }); // Pass otpTimer as a local variable to the view
  } catch (error) {
    console.log(error.message);
  }
};

const forgotResendOtp = async (req, res) => {
  try {
    const resendOtp = Math.floor(100000 + Math.random() * 900000);
    const mobile = req.session.user.mobile; // Assuming 'user' object contains 'mobile'
    const phoneNumbers = [mobile]; // Add other phone numbers here if needed
    //
    for (const phoneNumber of phoneNumbers) {
      const verification = await client.verify.v2
        .services(verifySid)
        .verifications.create({ to: `+91${phoneNumber}`, channel: "sms" });

      console.log(`OTP jjj sent to ${phoneNumber}: ${resendOtp}`);
    }
    req.session.forgotOtp = resendOtp;

    res.render("forgotOtpVerify", {
      message: "OTP has been resent.",
      otp: req.session.forgotOtp,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const forgotOtpverify = async (req, res) => {
  try {
    const otp = req.body.otp;
    const mobile = req.body.mobile; // Get the mobile number from the request
    console.log(mobile, "ppp");
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }
    const userData = await User.findOne({ mobile: mobile });

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(userData, "Anisha ");
    const verification = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({
        to: `+91${userData.mobile}`,
        code: otp,
      });
    if (verification.status === "approved") {
      console.log("Verification successful!");

      req.session.user_id = userData._id;
      console.log(req.session.user_id, "llll");
      // If OTP is valid, you can proceed with the desired action, such as allowing the user to reset their password
      res.render("resetpassword", { user_id: req.session.user_id });
    }
  } catch (error) {
    console.log(error.message);
  }
};

//reset password
const loadrewritePassword = async (req, res) => {
  try {
    res.render("resetpassword");
  } catch (error) {
    console.log(error.message);
  }
};

const resetPassword = async (req, res) => {
  console.log("js");
  try {
    console.log("jaii");
    const newPassword = req.body.newPassword;
    const confirmPassword = req.body.confirmPassword;

    if (!newPassword || !confirmPassword) {
      return res.render("resetpassword", {
        message: "Both password fields are required",
      });
    }
    console.log(newPassword, "jkjiki");
    console.log(confirmPassword, "jjjjjkoppo");
    if (newPassword !== confirmPassword) {
      return res.render("resetpassword", { message: "Passwords do not match" });
    }

    // Hash the new password before saving
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    const user_id = req.session.user_id; // Access the user_id from the session
    console.log(user_id, "hhhsssewwe");
    const user = await User.findByIdAndUpdate(
      user_id,
      { password: newPasswordHash },
      { new: true }
    );
    console.log("se", user);
    if (!user) {
      return res.redirect("/login");
    }

    // Clear the OTP from the session
    req.session.forgotOtp = undefined;
    req.session.user_id = undefined;

    return res.render("login", {
      message: "Password changed successfully",
    });
  } catch (error) {
    console.log(error.message);
    return res.render("resetpassword", { message: "An error occurred" });
  }
};

const ITEMS_PER_PAGE = 8;
const showProduct = async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const totalProducts = await Product.countDocuments({ is_listed: true });
    const User = req.session.user;
    const products = await Product.find({ is_listed: true })
      .skip((page - 1) * ITEMS_PER_PAGE) // Skip the appropriate number of items based on the page
      .limit(ITEMS_PER_PAGE); // Limit the number of items per page
    const categories = await Category.find({});

    res.render("showProduct", {
      products,
      categories: categories,
      User,
      totalProducts,
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      ITEMS_PER_PAGE,
    });
  } catch (error) {
    console.log(error.message);
  }
};
// product detail

const productdetail = async (req, res) => {
  try {
    const User = req.session.user;
    const categoryId = req.query.id;
    const productId = req.query.id;
    const categories = await Category.find({ _id: categoryId });
    const products = await Product.findOne({ _id: productId }).populate(
      "category"
    );

    const product = await Product.findOne({ _id: productId });

    if (!product) {
      console.log("not found");
    }

    const sizeInfo = await Quantity.findOne({ product: productId });
    const sizes = sizeInfo ? sizeInfo.quantities.map((q) => q.size) : [];

    // Fetch the quantities data and pass it to the template
    const quantitiesData = await Quantity.find({}).populate("product").exec();

    res.render("productdetail", {
      product,
      products,
      User,
      sizes,
      categories,
      quantities: quantitiesData, // Pass the quantities array to the template
    });
  } catch (error) {
    console.log(error);
  }
};

const search_product = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const ITEMS_PER_PAGE = 10;
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const categories = await Category.find();
    const totalProducts = await Product.countDocuments({ is_listed: true });
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    const pro = req.body.product;
    const product1 = await Product.find({
      name: { $regex: new RegExp(`^${pro}`, "i") },
    })
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    const user = req.session.user; // Assuming 'user' is the correct property

    const message =
      product1.length > 0 ? null : "There are no products matching the search.";

    res.render("showProduct", {
      user,
      products: product1,
      currentPage: page,
      totalPages,
      hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      ITEMS_PER_PAGE,
      totalProducts,
      message,
      categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const loadUserProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const user_id = req.session.user_id;
    const user = await User.findById(user_id);

    if (!user) {
      return res.redirect("/login");
    }
    const addressItem = await Address.find({ user: user_id });

    res.render("profile", { user, addressItem });
  } catch (error) {
    console.log(error.message);
  }
};

const showchangePassword = async (req, res) => {
  try {
    const User = req.session.user;
    res.render("changepassword", { User, message: null });
  } catch (error) {
    console.log(error.message);
  }
};

const changePassword = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const user = await User.findById(user_id);

    if (!user) {
      return res.redirect("/login");
    }

    // const { currentPassword, newPassword, confirmPassword } = req.body;

    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    const confirmPassword = req.body.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render("changePassword", {
        message: "All fields must be filled",
      });
    }
    let message = null;

    if (newPassword === currentPassword) {
      return res.render("changePassword", {
        message: "New passwords should not match with currentpassword",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.render("changePassword", {
        message: "New passwords do not match",
      });
    }
    if (newPassword === currentPassword) {
      return res.render("changePassword", {
        message: "New passwords should not 'match with currentpassword",
      });
    }

    // Check if the current password matches the stored hashed password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      console.log("ii");
      return res.render("changePassword", {
        message: "Current password is incorrect",
      });
    }
    // Hash the new password before saving
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.password = newPasswordHash;
    await user.save();

    return res.render("profile", {
      user: user,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const editProfile = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const user = await User.findById(user_id);

    if (!user) {
      return res.redirect("/login");
    }

    // Initialize an errors array to capture validation errors
    const errors = [];

    // Validate inputs (similar to registration validation)
    if (!user.mobile) {
      errors.push("Mobile number must be filled");
    }
    if (!/^\d{10}$/.test(req.body.mobile)) {
      errors.push("Mobile number must be 10 digits");
    }
    if (!req.body.username || /\d/.test(req.body.username)) {
      errors.push("Invalid username format");
    }

    // Check if any errors occurred
    if (errors.length > 0) {
      // Return validation errors as JSON response
      return res.status(400).json({ errors: errors });
    }

    // Update user's profile data
    user.username = req.body.username;
    user.mobile = req.body.mobile;
    user.email = req.body.email;
    await user.save();

    // Return success as JSON response
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: "An error occurred" });
  }
};

const filterByCategory = async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const categoryId = req.query.id;
    const category = await Category.find({});
    // Find the selected category by its ID
    const selectedCategory = category.find(
      (cat) => cat._id.toString() === categoryId
    );
    const totalProducts = await Product.countDocuments({
      category: categoryId,
      is_listed: true,
    }); // Get the total number of products

    const product = await Product.find({
      category: categoryId,
      is_listed: true,
    })
      .skip((page - 1) * ITEMS_PER_PAGE) // Skip the appropriate number of items based on the page
      .limit(ITEMS_PER_PAGE);
    const user = req.session.user;
    res.render("showProduct", {
      user,
      products: product,
      categories: category,
      totalProducts,
      currentPage: page,
      categoryName: selectedCategory ? selectedCategory.name : "All",
      hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      ITEMS_PER_PAGE,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "internal server error" });
  }
};

const pricerange = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const User = req.session.user;
    const min_price = req.body.min_price;
    const max_price = req.body.max_price;

    const categories = await Category.find();

    const product2 = await Product.find();

    const product = await Product.find({
      offerprice: { $gte: min_price, $lte: max_price },
    });
    const procount = await Product.find({
      offerprice: { $gte: min_price, $lte: max_price },
    }).countDocuments();
    if (!procount.length===0) {
      const products = []; // Empty array
      res.render("showProduct", {
        User,

        categories,
        totalProducts,
        product2,
        products: null,
        currentPage: page,
        hasPrevPage: page > 1,
        hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
        totalPages,
        msg: "there is no products in this price range",
        ITEMS_PER_PAGE,
      });
    }
    if (product) {
      const product2 = await Product.find().limit(4);
      res.render("showProduct", {
        User,

        totalProducts,
        currentPage: page,
        hasPrevPage: page > 1,
        hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
        categories,
        product2,
        products: product, // Use the correct variable here
        product1: product,
        ITEMS_PER_PAGE,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const contact = async (req, res) => {
  try {
    res.render("contact");
  } catch (error) {
    console.log(error.message);
  }
};

const userLogout = async (req, res) => {
  try {
    req.session.destroy();
    req.sessionStore.clear();
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  loadRegister,
  insertUser,
  loginLoad,
  verifyLogin,
  loadHome,
  loadVerifyOTP,
  userLogout,
  verifyOtp,
  resendOtp,
  startOtpTimer,
  loadForgotPassword,
  forgotVerifyNumber,
  forgotOtpverify,
  loadOtpPage,
  loadrewritePassword,
  showProduct,
  forgotResendOtp,
  productdetail,
  loadUserProfile,
  showchangePassword,
  changePassword,
  editProfile,
  filterByCategory,
  search_product,
  pricerange,
  resetPassword,
  contact,
};
