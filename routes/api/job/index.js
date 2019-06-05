const express = require("express");
const router = express.Router();

router.post("/", require("./post"));
router.patch("/:id", require("./patch"));
router.put("/:id", require("./put"));

module.exports = router;
