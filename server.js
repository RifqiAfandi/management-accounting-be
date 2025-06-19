require("dotenv").config();

const express = require("express");
const cors = require("cors");
const router = require("./routes");
const morgan = require("morgan");
const expressEjsLayouts = require("express-ejs-layouts");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

// View engine setup
app.set("view engine", "ejs");
app.use(expressEjsLayouts);
app.set("layout", "layouts");

// Routes
app.use("/api", router);

// Error handler
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message
    });
});

module.exports = app;