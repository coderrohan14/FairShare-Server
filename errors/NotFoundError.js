const CustomAPIError = require("./CustomAPIError");

module.exports = class NotFoundError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 404;
  }
};
