const mongoose = require("mongoose");
const MemberSchema = require("./Member");

const ExpenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide the expense name."],
    minLength: 1,
  },
  amount: {
    type: mongoose.Types.Decimal128,
    default: 0.0,
  },
  grp_id: {
    type: mongoose.Types.ObjectId,
    ref: "Group",
    required: [true, "Please provide the grp ID."],
  },
  borrowingList: {
    type: [MemberSchema],
    default: [],
  },
  lenderList: {
    type: [MemberSchema],
    default: [],
  },
  categoryName: {
    type: String,
    minLength: 1
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
  addedByUser: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide the user ID."],
  },
});

module.exports = new mongoose.model("Expenses", ExpenseSchema);
