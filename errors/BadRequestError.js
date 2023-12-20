const CustomAPIError = require("./CustomAPIError");

module.exports = class BadRequestError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
};
