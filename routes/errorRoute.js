const express = require("express");
const errorRoute = express();

errorRoute.set("view engine", "ejs");
errorRoute.set("views", "./views/users");

errorRoute.use(function (req, res, next) {
  res.status(404);
  if (req.xhr) {
    res.json({ error: "Not found" });
  } else {
    res.render("404");
  }
});

module.exports = errorRoute;
