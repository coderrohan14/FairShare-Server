const jwt = require("jsonwebtoken");
const { UnauthenticatedError } = require("../errors");

module.exports = async (req, res, next) => {
  console.log(req.cookies);
  if (!req.cookies) {
    next(new UnauthenticatedError("Authentication failed."));
  }
  const token = await req.cookies.XSRF_TOKEN;
  if (!token) {
    next(new UnauthenticatedError("Authentication failed."));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      next(new UnauthenticatedError(err.message));
    } else {
      req.body.user = payload;
      next();
    }
  });
};
