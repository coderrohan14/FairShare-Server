const Expense = require("../models/Expense");
const { BadRequestError, NotFoundError } = require("../errors");

const getAllExpenseInGroup = async (req, res) => {
  const { page, sortBy } = await req.query;
  const { groupID } = await req.params;
  const pageQuery = Number(page) || 1;
  const limitQuery = 10;
  const skipBy = (pageQuery - 1) * limitQuery;
  const sortByQuery = sortBy ? sortBy : "-dateAdded";
  const expenses = await Expense.find({ grp_id: groupID }).sort(sortByQuery).skip(skipBy).limit(limitQuery);
  if (expenses) {
    res.status(200).json({ success: true, expenses });
  } else {
    res.status(404).json({
      success: false,
      msg: "Unable to fetch all expenses in group at this time, please try again later.",
    });
  }
};

const getAllExpenseInGroupWithoutFilters = async (req, res) => {
    const { groupID } = await req.params;
    const expenses = await Expense.find({ grp_id: groupID })
    if (expenses) {
      res.status(200).json({ success: true, expenses });
    } else {
      res.status(404).json({
        success: false,
        msg: "Unable to fetch all expenses in group at this time, please try again later.",
      });
    }
  };

const addNewExpense = async (req, res) => {
  let { name, amount, grp_id, borrowingList, lenderList, categoryName } = await req.body;
  const { userID } = await user;
  if (!name || !userID || !grp_id || !borrowingList || !lenderList) {
    throw new BadRequestError(
      "Please provide all the necessary information for the Expense."
    );
  }
  const expense = await Expense.create({ name, amount, grp_id, borrowingList, lenderList, categoryName, addedByUser: userID });
  if (expense) {
      res.status(201).json({
        success: true,
        expense,
      });
    } else {
    res.status(500).json({
      success: false,
      msg: "Unable to add the expense, please try again later.",
    });
  }
};

const deleteAllExpensesInGrp = async (req, res) => {
  const { groupID } = await req.params;
  const deletionResult = await Expense.deleteMany({ grp_id: groupID });
  if (deletionResult.ok === 1 && deletionResult.deletedCount > 0) {
    res.status(200).json({
      success: true,
      msg: "All the expenses in this group deleted successfully!",
    });
  } else {
    res.status(500).json({
      success: false,
      msg: "Deletion failed or no documents were deleted.",
    });
  }
};

const deleteSingleExpense = async (req, res) => {
    const { expenseID } = await req.params;
    const deletionResult = await Expense.deleteMany({ _id: expenseID });
    if (deletionResult.ok === 1 && deletionResult.deletedCount > 0) {
      res.status(200).json({
        success: true,
        msg: "The given expenses is deleted successfully!",
      });
    } else {
      res.status(500).json({
        success: false,
        msg: "Deletion failed or no documents were deleted.",
      });
    }
  };

const getSingleExpense = async (req, res) => {
  const { expenseID } = await req.params;
  const expense = await Group.findOne({ _id: expenseID });
  if (expense) {
    res.status(200).json({ success: true, expense });
  } else {
    throw new NotFoundError("No expense found with the given expenseID.");
  }
};

const updateExpense = async (req, res) => {
  const { expenseID } = await req.params;
  const { name, amount, borrowingList, lenderList, categoryName } = await req.body;
  const updateBody = {};
  if (name) updateBody.name = name;
  if (amount) updateBody.amount = amount;
  if (borrowingList) updateBody.borrowingList = borrowingList;
  if (lenderList) updateBody.lenderList = lenderList;
  if (categoryName) updateBody.categoryName = categoryName;
  const updatedExpense = await Expense.findOneAndUpdate(
    { _id: expenseID },
    updateBody,
    {
      new: true,
      runValidators: true,
    }
  );
  if (updatedExpense) {
    res.status(200).json({ success: true, updatedExpense });
  } else {
    res.status(500).json({
      success: false,
      msg: "Unable to update the Expense, please try again later.",
    });
  }
};

const findUserTotalInGrp = async (req, res) => {
  const { userID } = await user;
  const { groupID } = await req.params;
  if (!userID || !groupID) {
    throw new BadRequestError("Please provide all the necessary information.");
  }
//   const grpExpenses = await Expense.find({ grp_id: groupID })
//   if (grpExpenses) {

//   }

  const aggregationResult = await Expense.aggregate([
    {
      $match: {
        grp_id: groupID,
      },
    },
    {
      $project: {
        _id: 0,
        totalBorrowed: {
          $sum: {
            $map: {
              input: "$borrowingList",
              as: "borrower",
              in: {
                $cond: [
                  { $eq: ["$$borrower.memberID", userID] },
                  {
                    $multiply: [
                      "$amount",
                      { $divide: ["$$borrower.balance", 100] },
                    ],
                  },
                  0
                ],
              },
            },
          },
        },
        totalLent: {
          $sum: {
            $map: {
              input: "$lenderList",
              as: "lender",
              in: {
                $cond: [
                  { $eq: ["$$lender.memberID", userID] },
                  {
                    $multiply: [
                      "$amount",
                      { $divide: ["$$lender.balance", 100] },
                    ],
                  },
                  0
                ],
              },
            },
          },
        },
      },
    },
    {
      $project: {
        totalExpenditure: { $subtract: ["$totalLent", "$totalBorrowed"] },
      },
    },
  ]);

    if (aggregationResult.length > 0) {
        const totalExpenditure = aggregationResult[0].totalExpenditure;
        console.log('Total Expenditure:', totalExpenditure);
        // return totalExpenditure;
    } else {
        console.log('No expenses found for the given group ID.');
        // return 0;
    }
  if (aggregationResult) {
    res.status(200).json({ success: true, aggregationResult });
  } else {
    res.status(500).json({
      success: false,
      msg: "Unable to get the total for the user, please try again later.",
    });
  }
};

module.exports = {
  getAllExpenseInGroup,
  getAllExpenseInGroupWithoutFilters,
  addNewExpense,
  deleteAllExpensesInGrp,
  deleteSingleExpense,
  getSingleExpense,
  updateExpense,
  findUserTotalInGrp,
};
