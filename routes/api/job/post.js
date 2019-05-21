const FieldValue = require("firebase-admin").firestore.FieldValue;
const fetch = require("node-fetch");

const db = require("../../../db");
const STATUS = require("../../../consts").STATUS;

const post = async (req, res) => {
  // TODO: Input validation
  const url = req.body.url.split("?")[0]; // Remove search string

  // Save the job in the "jobs" collection
  const jobsRef = db.collection("jobs");
  const jobId = await jobsRef
    .where("url", "==", url)
    .get()
    .then(async snapshot => {
      if (snapshot.empty) {
        // Parse the job offer
        let jobInfo = {};
        const functionURL =
          "https://us-central1-lejobhq.cloudfunctions.net/parse-job-info";
        await fetch(functionURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url })
        })
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              throw new Error(
                `Error ${data.error.status}: "${
                  data.error.text
                }" for Cloud Function "${functionURL}"`
              );
            }
            jobInfo = data;
          })
          .catch(err => console.error(err));

        // Save the new job
        const timestamp = FieldValue.serverTimestamp();
        const newJob = await jobsRef.add({
          url: url,
          ...jobInfo,
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
          status: STATUS.CREATED,
          timeline: [
            {
              status: STATUS.CREATED,
              metadata: req.body.metadata || {},
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
