const db = require("../../../db");

const get = async (req, res) => {
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
};

module.exports = get;
