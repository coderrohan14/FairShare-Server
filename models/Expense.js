const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide the expense name."],
    minLength: 1,
  },
  amount: {
    type: mongoose.Types.Decimal128,
    required: [true, "Please provide the amount."],
  },
  grp_id: {
    type: mongoose.Types.ObjectId,
    ref: "Group",
    required: [true, "Please provide the grp ID."],
  },
  borrowingList: {
    type: [
      {
        userID: mongoose.Types.ObjectId,
        percentage: mongoose.Types.Decimal128,
      },
    ],
    default: [],
  },
  lenderList: {
    type: [
      {
        userID: mongoose.Types.ObjectId,
        percentage: mongoose.Types.Decimal128,
      },
    ],
    default: [],
  },
  categoryName: {
    type: String,
    minLength: 1,
    default: "Miscellaneous",
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

module.exports = new mongoose.model("Expense", ExpenseSchema);
