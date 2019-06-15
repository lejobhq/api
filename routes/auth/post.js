const FieldValue = require("firebase-admin").firestore.FieldValue;
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");

const db = require("../../db");

const post = async (req, res) => {
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

        // Generate and send JWT
        const jwt_token = jwt.sign({ userId }, process.env.JWT_SECRET, {
          expiresIn: "7d"
        });

        res.status(200);
        res.send({ jwt: jwt_token });
      });
  }

  verify().catch(error => {
    console.error(error);
    res.status(403);
    res.send({});
  });
};

module.exports = post;
