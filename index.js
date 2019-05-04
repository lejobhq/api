const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const Firestore = require("@google-cloud/firestore");
const FieldValue = require("firebase-admin").firestore.FieldValue;
const jwt = require("jsonwebtoken");

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

// JWT middleware
const validateSession = (req, res, next) => {
  let jwt_token = req.headers["x-access-token"] || req.headers["authorization"];
  if (!jwt_token) {
    res.status(401);
    res.send({ error: "Unauthorized" });
    return;
  }

  if (jwt_token.startsWith("Bearer ")) {
    jwt_token = jwt_token.slice(7);
  }

  jwt.verify(jwt_token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(401);
      res.send({ error: "Unauthorized" });
      return;
    }
    req.userId = decoded.userId;
    next();
  });
};

// Test JWT
app.get("/user", validateSession, (req, res) => {
  const usersRef = db.collection("users");
  usersRef
    .doc(req.userId)
    .get()
    .then(doc => {
      if (!doc.exists) {
        res.status(404);
        res.send({
          error: "Not Found"
        });
        return;
      }

      res.send({ data: doc.data() });
    });
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
          snapshot.forEach(doc => {
            userId = doc.id;
          });
        }

        // TODO: generate and send JWT
        const jwt_token = jwt.sign({ userId }, process.env.JWT_SECRET, {});

        res.status(200);
        res.send({ jwt: jwt_token });
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
