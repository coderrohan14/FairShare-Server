const mongoose = require("mongoose");

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const PasswordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide the user's email id."],
      unique: [true, "The given email address is already registered."],
      validate: {
        validator: function (value) {
          return emailRegex.test(value);
        },
        message: (props) => `'${props.value}' is not a valid email address!`,
      },
    },
    expireAt: {
      type: Date,
    },
    resetToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// TTL index
PasswordResetSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = new mongoose.model("PasswordReset", PasswordResetSchema);
