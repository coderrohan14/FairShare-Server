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
        userID: {
          type: mongoose.Types.ObjectId,
          required: [true, "Please provide the borrowing userID."],
        },
        percentage: {
          type: mongoose.Types.Decimal128,
          required: [
            true,
            "Please provide the borrowing user's percentage in total amount.",
          ],
        },
      },
    ],
    default: [],
  },
  lenderList: {
    type: [
      {
        userID: {
          type: mongoose.Types.ObjectId,
          required: [true, "Please provide the lending userID."],
        },
        percentage: {
          type: mongoose.Types.Decimal128,
          required: [
            true,
            "Please provide the lending user's percentage in total amount.",
          ],
        },
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
