const jwt = require("jsonwebtoken");

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

module.exports = validateSession;
