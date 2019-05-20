const FieldValue = require("firebase-admin").firestore.FieldValue;

const db = require("../../../db");
const STATUS = require("../../../consts").STATUS;

const put = async (req, res) => {
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
      metadata: req.body.metadata || {},
      date: Date.now()
    }),
    updated_at: timestamp
  });

  res.status(202);
  res.send({});
  return;
};

module.exports = put;
