const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

//Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one number, and one special character.

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const UnverifiedUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide the user's name."],
      minLength: 1,
      maxLength: 50,
    },
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
    picture: {
      type: String,
      default:
        "https://www.transparentpng.com/thumb/user/gray-user-profile-icon-png-fP8Q1P.png",
    },
    password: {
      type: String,
      validate: {
        validator: function (value) {
          return passwordRegex.test(value);
        },
        message: "Password is not strong enough!",
      },
    },
    expireAt: {
      type: Date,
    },
    verificationToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// TTL index
UnverifiedUserSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

//Hash password
UnverifiedUserSchema.pre("save", function (next) {
  if (!this.isModified("password")) return next();
  if (this.password) {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) return next(err);
      bcrypt.hash(this.password, salt, (err, hash) => {
        if (err) return next(err);
        this.password = hash;
        next();
      });
    });
  }
});

module.exports = new mongoose.model("UnverifiedUser", UnverifiedUserSchema);
