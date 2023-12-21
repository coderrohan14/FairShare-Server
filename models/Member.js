const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema({
  memberID: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide the user ID."],
  },
  balance: {
    type: mongoose.Types.Decimal128,
    default: 0.0,
  },
});

module.exports = MemberSchema;
