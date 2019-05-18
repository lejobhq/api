const Firestore = require("@google-cloud/firestore");

// Initialise Firestore database
const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.FIRESTORE_KEY_FILE_PATH
});

module.exports = db;
