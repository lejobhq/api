const express = require("express");
const router = express.Router();

router.use("/job", require("./job"));
router.use("/jobs", require("./jobs"));
router.use("/status", require("./status"));
router.use("/user", require("./user"));

module.exports = router;
