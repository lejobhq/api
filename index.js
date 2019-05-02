const express = require("express");
const app = express();

// Load local environment variables
require("dotenv").config({ path: ".env" });

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Listening on port ${port} ...`);
});
