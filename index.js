const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const Firestore = require("@google-cloud/firestore");
const FieldValue = require("firebase-admin").firestore.FieldValue;

const app = express();

app.use(express.json());

// Load environment variables
require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env" : ".env.dev"
});

// Initialise Firestore database
const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.FIRESTORE_KEY_FILE_PATH
});

// Auth
app.post("/auth", async (req, res) => {
  const CLIENT_ID = process.env.GOOGLE_SIGNIN_CLIENT_ID;
  const client = new OAuth2Client(CLIENT_ID);

  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: req.body.token,
      audience: `${CLIENT_ID}.apps.googleusercontent.com`
    });

    const {
      email,
      email_verified,
      name,
      picture,
      given_name,
      family_name,
      locale
    } = ticket.getPayload();

    const usersRef = db.collection("users");
    usersRef
      .where("email", "==", email)
      .get()
      .then(async snapshot => {
        let userId;
        if (snapshot.empty) {
          // Create a new user
          const timestamp = FieldValue.serverTimestamp();
          const newUser = await usersRef.add({
            email,
            email_verified,
            name,
            picture,
            given_name,
            family_name,
            locale,
            created_at: timestamp,
            updated_at: timestamp
          });

          userId = newUser.id;
        } else {
          // Retrieve the user ID from DB
          userId = snapshot[0].id;
        }

        // TODO: generate and send JWT

        res.status(200);
        res.send({ userId });
      });
  }

  verify().catch(error => {
    console.error(error);
    res.status(403);
    res.send({});
  });
});

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
