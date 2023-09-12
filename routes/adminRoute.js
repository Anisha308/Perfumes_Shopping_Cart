const express = require("express");
const admin_route = express();
const session = require("express-session");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
const multipleUpload = upload.fields([
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
]);

const nocache = require("nocache");
admin_route.use(nocache());

const config = require("../config/config");

const adminauth = require("../middleware/adminauth");

admin_route.set("view engine", "ejs");
admin_route.set("views", "./views/admin");

admin_route.use(express.json());
admin_route.use(
  express.urlencoded({
    extended: true,
  })
);

const adminControllers = require("../controllers/adminControllers");
const productController = require("../controllers/productController");
const categoryController = require("../controllers/categoryControllers");
const orderController = require("../controllers/orderController");
const addressController = require("../controllers/addressController");
admin_route.use(
  session({
    secret: config.sessionSecret,
    saveUninitialized: true,
    resave: false,
  })
);

admin_route.get(
  "/adminlogin",
  adminauth.isAdminLogout,
  adminControllers.loadlogin
);
admin_route.post("/adminlogin", adminControllers.verifyadminLogin);
admin_route.get(
  "/dashboard",
  adminauth.isAdminLogin,
  adminControllers.loadDashboard
);

admin_route.get(
  "/adminhome",
  adminauth.isAdminLogin,
  adminControllers.loadHome
);
admin_route.get("/loadUser", adminauth.isAdminLogin, adminControllers.loadUser);

admin_route.get(
  "/blockUser",
  adminauth.isAdminLogin,
  adminControllers.blockUser
);
admin_route.get(
  "/unBlockUser",
  adminauth.isAdminLogin,
  adminControllers.unBlockUser
);

admin_route.get(
  "/loadCategory",
  adminauth.isAdminLogin,
  categoryController.loadCategory
);
admin_route.post(
  "/addCategory",
  adminauth.isAdminLogin,
  categoryController.addCategory
);
admin_route.get(
  "/addCategory",
  adminauth.isAdminLogin,
  categoryController.showCategory
);
admin_route.get(
  "/editcategories",
  adminauth.isAdminLogin,
  categoryController.loadUpdateCategory
);
admin_route.post(
  "/editcategories",
  adminauth.isAdminLogin,
  categoryController.updateCategory
);
admin_route.get(
  "/changestatus",
  adminauth.isAdminLogin,
  categoryController.changeStatus
);

//productlist

admin_route.get(
  "/productList",
  adminauth.isAdminLogin,
  productController.loadProductList
);
admin_route.get(
  "/addProduct",
  adminauth.isAdminLogin,
  productController.showAddProduct
);
admin_route.post(
  "/addProduct",
  adminauth.isAdminLogin,
  productController.createProduct
);
admin_route.get(
  "/changeProductstatus",
  adminauth.isAdminLogin,
  productController.changeStatus
);

admin_route.get(
  "/editProductList",
  adminauth.isAdminLogin,
  productController.editProductList
);

// admin_route.delete(
//   "/delete/:productId",
//   adminauth.isAdminLogin,productController.deleteProduct
// );
admin_route.get(
  "/adminlogout",
  adminauth.isAdminLogin,
  adminControllers.adminlogout
);

admin_route.post(
  "/updateProductList",
  multipleUpload,
  productController.updateProductList
);

admin_route.get(
  "/displayOrder",
  adminauth.isAdminLogin,
  orderController.order_status
);
admin_route.post(
  "/orderUpdate/:id",
  adminauth.isAdminLogin,
  orderController.orderUpdate
);
admin_route.post(
  "/cancelOrder/:id",
  adminauth.isAdminLogin,
  orderController.cancelUserOrder
);

// admin_route.post("/edit-address/:id", addressController.editProfileAddress);
admin_route.get(
  "/salesreport",
  adminauth.isAdminLogin,
  adminControllers.salesreport
);
admin_route.post(
  "/filterorder",
  adminauth.isAdminLogin,
  orderController.filterorder
);

admin_route.post(
  "/search_category",
  adminauth.isAdminLogin,
  categoryController.search_category
);
admin_route.post("/refundOrder/:id", orderController.refundOrder);

admin_route.get(
  "/add_coupon_page",
  adminauth.isAdminLogin,
  adminControllers.addcouponpage
);
admin_route.post(
  "/add_coupon",
  adminauth.isAdminLogin,
  adminControllers.addcoupon
);

admin_route.get(
  "/delete_coupon/:id",
  adminauth.isAdminLogin,
  adminControllers.deletecoupon
);
admin_route.get(
  "/edit_coupon/:id",
  adminauth.isAdminLogin,
  adminControllers.editcoupon
);
admin_route.post(
  "/update_coupon/:id",
  adminauth.isAdminLogin,
  adminControllers.updatecoupon
);
admin_route.get(
  "/coupons",
  adminauth.isAdminLogin,
  adminControllers.find_coupon
);

module.exports = admin_route;
