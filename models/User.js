const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const UserSchema = new mongoose.Schema(
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
      default: "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
    },
    password: {
      type: String,
    },
  },
  { timestamps: true }
);

UserSchema.methods.comparePasswords = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

UserSchema.methods.createJWT = function () {
  return jwt.sign(
    { userID: this._id, name: this.name },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_LIFETIME,
    }
  );
};

module.exports = new mongoose.model("User", UserSchema);
