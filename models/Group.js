const mongoose = require("mongoose");
const MemberSchema = require("./Member");

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide the user's name."],
    minLength: 1,
  },
  members: {
    type: [MemberSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = new mongoose.model("Group", GroupSchema);
