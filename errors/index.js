const CustomAPIError = require("./CustomAPIError");
const BadRequestError = require("./BadRequestError");
const UnauthenticatedError = require("./UnauthenticatedError");
const NotFoundError = require("./NotFoundError");

module.exports = {
  CustomAPIError,
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
};
