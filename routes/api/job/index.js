const express = require("express");
const router = express.Router();

router.post("/", require("./post"));
router.put("/", require("./put"));

module.exports = router;
