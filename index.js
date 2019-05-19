const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const validateSession = require("./middlewares/validate-session");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ["https://www.lejobhq.com"],
    methods: ["GET", "POST", "PUT", "OPTIONS"]
  })
);
app.use(express.json());

// Load environment variables
require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env" : ".env.dev"
});

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/api", validateSession, require("./routes/api"));

// Serve client static files
const clientPath = "client";

app.use(express.static(clientPath));
app.get("*", (req, res) => {
  res.sendFile("/index.html", { root: clientPath });
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Listening on port ${port} ...`);
});
