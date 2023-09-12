// const client = require('twilio')('ACcf579c18a8281da4edd4ea3fa0a03e77', 'ba132c414ca532023f64056066344fdc')
const path= require("path")
const dotenv = require('dotenv')

dotenv.config({path:"./.env"})


const express = require('express')
const app = express()


app.use(express.static(__dirname + '/public/uploads'))
app.use(express.static(__dirname + '/public/admin'))
app.use(express.static(__dirname + "/public"));
app.set("views", path.join(__dirname, "views"));

const connectToDatabase= require("./db")

const userRoute = require('./routes/userRoute')
app.use('/', userRoute)

connectToDatabase();

const adminRoute = require('./routes/adminRoute')
app.use('/', adminRoute)

const errorRoute = require("./routes/errorRoute");

app.use(errorRoute)

app.listen(process.env.PORT, () => {
    console.log(`server started at http://localhost:${process.env.PORT}`);
});




