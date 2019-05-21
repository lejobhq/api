const STATUS = require("../../../consts").STATUS;

const get = (req, res) => {
  res.send({ data: { status: STATUS } });
};

module.exports = get;
