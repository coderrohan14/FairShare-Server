const { UnauthenticatedError } = require("../errors");

module.exports = async (req, res, next) => {
  const headerToken = await req.headers.x_xsrf_token;
  const cookieToken = await req.cookies.XSRF_TOKEN;
  if (headerToken !== cookieToken) {
    next(new UnauthenticatedError("Authentication failed, please try again."));
  }
  next();
};
