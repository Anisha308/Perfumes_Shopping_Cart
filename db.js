const mongoose = require("mongoose");

const connectToDatabase = () => {
  mongoose
    .connect(
      "mongodb+srv://anisha:parfum%40123@parfum.rc5drnh.mongodb.net/?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    )
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      console.error("Error connecting to MongoDB:", error.message);
    });
};

module.exports = connectToDatabase;
