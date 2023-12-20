const CustomAPIError = require("./CustomAPIError");

module.exports = class UnauthenticatedError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 401;
  }
};
