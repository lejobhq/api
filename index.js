const express = require("express");
const { OAuth2Client } = require("google-auth-library");

const app = express();

// Load local environment variables
require("dotenv").config({ path: ".env" });

app.use(express.json());

app.post("/auth", async (req, res) => {
  const CLIENT_ID = process.env.GOOGLE_SIGNIN_CLIENT_ID;
  const client = new OAuth2Client(CLIENT_ID);

  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: req.body.token,
      audience: `${CLIENT_ID}.apps.googleusercontent.com`
    });
    const payload = ticket.getPayload();
    // TODO
    console.dir(payload);
  }

  verify()
    .then(_ => res.send({ ok: true }))
    .catch(error => {
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
