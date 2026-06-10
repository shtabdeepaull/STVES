const asyncHandler = require("../utils/asyncHandler");
const qrService = require("../services/qr.service");

const verifyQR = asyncHandler(async (req, res) => {
  const qrValue = req.params.qrValue;

  const result = await qrService.verifyQR(qrValue);

  return res.status(result.statusCode).json(result.response);
});

module.exports = {
  verifyQR,
};