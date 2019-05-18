const db = require("../../../db");

const get = (req, res) => {
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
};

module.exports = get;
