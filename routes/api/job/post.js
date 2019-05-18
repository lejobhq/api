const FieldValue = require("firebase-admin").firestore.FieldValue;
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

const db = require("../../../db");
const STATUS = require("../../../consts").STATUS;

const post = async (req, res) => {
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
};

module.exports = post;
