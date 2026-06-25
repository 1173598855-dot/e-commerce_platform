function sendRes(res, data = null, message = 'success', statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendError(res, message = '请求失败', statusCode = 400, data = null) {
  res.status(statusCode).json({
    success: false,
    message,
    data,
  });
}

module.exports = { sendRes, sendError };
