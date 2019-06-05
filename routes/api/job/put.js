const FieldValue = require("firebase-admin").firestore.FieldValue;

const db = require("../../../db");

const put = async (req, res) => {
  const jobId = req.params.id;
  const jobRef = db.collection("jobs").doc(jobId);

  const jobInfo = await jobRef
    .get()
    .then(doc => {
      if (!doc.exists) {
        throw new Error("Invalid job");
      }
      return doc.data();
    })
    .catch(error => {
      console.error(error);
      res.status(400);
      res.send({ error: "Bad Request" });
    });

  // Only allow jobs to be edited once after they were first created
  if (jobInfo.isNew) {
    const timestamp = FieldValue.serverTimestamp();
    await jobRef.update({
      ...req.body,
      isNew: false,
      updated_at: timestamp
    });
  }

  res.status(202);
  res.send({});
  return;
};

module.exports = put;
