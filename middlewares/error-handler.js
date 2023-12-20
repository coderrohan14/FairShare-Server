const errorHandler = (err, req, res, next) => {
  const code = err.statusCode || 500;
  const msg = err.message || "Something went wrong, please try again later.";
  res
    .status(code)
    .json({ success: false, err: { statusCode: code, msg: msg } });
};

module.exports = errorHandler;
