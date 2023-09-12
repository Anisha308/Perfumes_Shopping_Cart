const multer = require("multer");

// Define storage settings for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads"); // Set the destination directory where files will be stored
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename =
      file.fieldname +
      "-" +
      uniqueSuffix +
      "." +
      file.originalname.split(".").pop();
    cb(null, filename); // Set the filename for the stored file
  },
});

// Create multer middleware instance with the storage settings
const upload = multer({ storage: storage });

// Middleware function to handle file uploads
const uploadImages = upload.array("images", 5);

module.exports = {
  uploadImages,
};
