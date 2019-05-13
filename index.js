const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const Firestore = require("@google-cloud/firestore");
const FieldValue = require("firebase-admin").firestore.FieldValue;
const jwt = require("jsonwebtoken");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

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

// Jobs
const STATUS = {
  CREATED: "CREATED",
  APPLIED: "APPLIED",
  REJECTED: "REJECTED",
  NO_RESPONSE: "NO_RESPONSE",
  NO_LONGER_INTERESTED: "NO_LONGER_INTERESTED",
  INTERVIEW_ROUND_1: "INTERVIEW_ROUND_1",
  INTERVIEW_ROUND_2: "INTERVIEW_ROUND_2",
  INTERVIEW_ROUND_3: "INTERVIEW_ROUND_3",
  INTERVIEW_ROUND_4: "INTERVIEW_ROUND_4",
  INTERVIEW_ROUND_5: "INTERVIEW_ROUND_5",
  INTERVIEW_ROUND_6: "INTERVIEW_ROUND_6",
  INTERVIEW_ROUND_7: "INTERVIEW_ROUND_7",
  INTERVIEW_ROUND_8: "INTERVIEW_ROUND_8",
  INTERVIEW_ROUND_9: "INTERVIEW_ROUND_9",
  INTERVIEW_ROUND_10: "INTERVIEW_ROUND_10",
  OFFER: "OFFER",
  NEGOTIATING: "NEGOTIATING",
  ACCEPTED: "ACCEPTED"
};

app.get("/jobs", validateSession, async (req, res) => {
  const usersJobsRef = db
    .collection("users")
    .doc(req.userId)
    .collection("jobs");
  const usersJobs = await usersJobsRef.get().then(snapshot => {
    const usersJobs = [];
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        usersJobs.push({ usersJobId: doc.id, ...doc.data() });
      });
    }
    return usersJobs;
  });

  const jobsRef = db.collection("jobs");
  const jobs = await Promise.all(
    usersJobs.map(
      async ({ id }) =>
        await jobsRef
          .doc(id)
          .get()
          .then(doc => {
            if (doc.exists) {
              return { id: doc.id, ...doc.data() };
            }
          })
    )
  );

  res.send({
    data: {
      jobs: usersJobs.map(usersJob => ({
        ...jobs.find(job => job.id === usersJob.id),
        ...usersJob
      }))
    }
  });
  return;
});

app.post("/job", validateSession, async (req, res) => {
  // TODO: Input validation
  const url = req.body.url.split("?")[0]; // Remove search string

  // Parse the job offer
  function parseStackOverflow(html) {
    const $ = cheerio.load(html);
    const [title, company] = $("title")
      .text()
      .replace("  - Stack Overflow", "")
      .split(" at ");
    const logo = $(".job-details--header .s-avatar .hmx100.wmx100").attr("src");
    const visa = !!$(".-visa").length;
    const relocation = !!$(".-relocation").length;
    const experience = $(".job-details--about")
      .children()
      .eq(0)
      .children()
      .eq(1)
      .children(".fw-bold")
      .text();
    const company_size = $(".job-details--about")
      .children()
      .eq(1)
      .children()
      .eq(1)
      .children(".fw-bold")
      .text();
    const technologies = $(".job-details__spaced .post-tag.job-link")
      .map((_, el) => $(el).text())
      .get();

    return {
      title,
      company,
      logo,
      visa,
      relocation,
      experience,
      company_size,
      technologies
    };
  }

  let metadata = {};
  await puppeteer
    .launch()
    .then(browser => browser.newPage())
    .then(page => page.goto(url).then(_ => page.content()))
    .then(html => {
      if (url.startsWith("https://stackoverflow.com/jobs/")) {
        metadata = parseStackOverflow(html);
      }
    })
    .catch(err => console.error(err));

  // Save the job in the "jobs" collection
  const jobsRef = db.collection("jobs");
  const jobId = await jobsRef
    .where("url", "==", url)
    .get()
    .then(async snapshot => {
      if (snapshot.empty) {
        const timestamp = FieldValue.serverTimestamp();
        const newJob = await jobsRef.add({
          url: url,
          ...metadata,
          created_at: timestamp,
          updated_at: timestamp
        });
        return newJob.id;
      }

      let id;
      snapshot.forEach(doc => (id = doc.id));
      return id;
    });

  // Save the job in the "users"/"jobs" collection
  const usersJobsRef = db
    .collection("users")
    .doc(req.userId)
    .collection("jobs");

  await usersJobsRef
    .where("url", "==", url)
    .get()
    .then(async snapshot => {
      if (snapshot.empty) {
        const timestamp = FieldValue.serverTimestamp();
        const newUsersJob = await usersJobsRef.add({
          id: jobId,
          url: url,
          timeline: [
            {
              status: STATUS.CREATED,
              date: Date.now()
            }
          ],
          created_at: timestamp,
          updated_at: timestamp
        });
        res.send({ data: { id: newUsersJob.id } });
        return;
      }
      res.status(400);
      res.send({
        error: "Bad Request",
        errorText: "Job already exists for this user."
      });
    });
});

app.put("/job", validateSession, async (req, res) => {
  // TODO: Input validation
  const usersJobId = req.body.usersJobId;
  const usersJobsRef = db
    .collection("users")
    .doc(req.userId)
    .collection("jobs");

  const timestamp = FieldValue.serverTimestamp();
  await usersJobsRef.doc(usersJobId).update({
    timeline: FieldValue.arrayUnion({
      status: STATUS[req.body.status],
      date: Date.now()
    }),
    updated_at: timestamp
  });

  res.status(202);
  res.send({});
  return;
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
