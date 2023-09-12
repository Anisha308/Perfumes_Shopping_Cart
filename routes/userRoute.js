const express = require("express");
const user_route = express();
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);


const nocache = require("nocache");
user_route.use(nocache());

const config = require("../config/config");

const auth = require("../middleware/auth");

user_route.set("view engine", "ejs");
user_route.set("views", "./views/users");

user_route.use(express.json());
user_route.use(express.urlencoded({ extended: true }));
// user_route.use(express.static(__dirname+'/public/users'))

const userController = require("../controllers/userControllers");
const addressController = require("../controllers/addressController");
// Configure MongoDB session store
const store = new MongoDBStore({
  uri: "mongodb://127.0.0.1:27017/fragrancia",
  collection: "sessions" 
});

store.on("error", function (error) {
  console.log("MongoDB session store connection error: ", error);
});
 

user_route.use(
  session({
    secret: config.sessionSecret,
    saveUninitialized: true,
    resave: false,
    store: store
  })
);

const quantityController = require("../controllers/quantityControllers")




user_route.get("/register", auth.isLogout, userController.loadRegister);
user_route.post("/register", auth.isLogout, userController.insertUser);

// user_route.get('/',auth.isLogout,userController.loginLoad)
user_route.get("/login", auth.isLogout, userController.loginLoad);
user_route.post("/login", auth.isLogout,userController.verifyLogin);

user_route.get("/", userController.loadHome);
user_route.get("/home", userController.loadHome);

user_route.get(
  "/verifyotp",
  auth.isLogout,
  userController.startOtpTimer,
  userController.loadVerifyOTP
);
const orderController=require('../controllers/orderController')
const cartController = require("../controllers/cartController");
user_route.post("/verifyotp",auth.isLogout, userController.verifyOtp);
//resend OTP
user_route.get("/resend", auth.isLogout, userController.resendOtp);

user_route.get("/forgotResend", auth.isLogout, userController.forgotResendOtp);

//forgot password
user_route.get("/forgotpassword",auth.isLogout, userController.loadForgotPassword);
user_route.post("/forgotpassword",auth.isLogout, userController.forgotVerifyNumber);
 
//change password
user_route.get("/changepassword",auth.isLogin, userController.showchangePassword);
user_route.post('/changepassword',auth.isLogin,userController.changePassword)
// Load OTP verification paget
user_route.get("/forgotOtpVerify",auth.isLogout, userController.loadOtpPage);

// Verify OTP and allow password reset
user_route.post("/forgotOtpVerify", userController.forgotOtpverify);

// Load reset password page
user_route.get("/resetpassword", auth.isLogout, userController.loadrewritePassword);
user_route.post(
  "/resetpassword",
  auth.isLogout,
  userController.resetPassword
);




user_route.get("/showProduct", userController.showProduct);
user_route.get("/productdetail", userController.productdetail);
user_route.get("/logout",auth.isLogin, userController.userLogout);


user_route.get("/profile", auth.isLogin,userController.loadUserProfile);

user_route.post("/cart/:id", auth.isLogin,cartController.addToCart);
user_route.get("/cart",auth.isLogin, cartController.userCart);

user_route.post("/incrementQuantity",auth.isLogin, cartController.incrementQuantity);
user_route.post("/decrementQuantity", auth.isLogin,cartController.decrementQuantity);
user_route.post("/delete/:productId", auth.isLogin,cartController.deleteCartItem);
user_route.get("/checkout",auth.isLogin, cartController.checkout);


user_route.get('/address',auth.isLogin,addressController.user_Address) //to display the profile address  page
user_route.post("/addProfileaddress",auth.isLogin, addressController.addProfileAddress);
//add addresss


user_route.post("/addAddress", auth.isLogin,addressController.addAddress)
user_route.post('/placeOrder/:id',auth.isLogin, orderController.placeOrder);

user_route.post("/delete/:addressId",auth.isLogin,addressController.pdeleteAddress);

//orerlist

user_route.get("/orderList",auth.isLogin,orderController.order_List);
user_route.get("/UserorderUpdate/:id",auth.isLogin, orderController.UserorderUpdate);

user_route.post("/edit-address", auth.isLogin,addressController.editProfileAddress);
user_route.post("/cancelOrder/:id",auth.isLogin,orderController.cancelUserOrder);
user_route.post("/returnOrder/:id", auth.isLogin,orderController.returnOrder);


user_route.get(
  "/filter-by-category",
  userController.filterByCategory
);
user_route.post('/editprofile',auth.isLogin, userController.editProfile)

user_route.post("/search_pro", userController.search_product);
user_route.post('/createOrder',auth.isLogin, orderController.createOrder)
user_route.get("/success", auth.isLogin,orderController.successPage);
user_route.post('/isOrderComplete', auth.isLogin, orderController.IsOrderComplete)

user_route.post("/pricerange", userController.pricerange);


user_route.post("/coupon", auth.isLogin, orderController.coupon);
user_route.post("/cancel_coupon", orderController.cancelCoupon);


module.exports = user_route;
