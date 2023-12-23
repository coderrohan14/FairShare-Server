const express = require("express");
const {
  getAllExpenseInGroup,
  getAllExpenseInGroupWithoutFilters,
  addNewExpense,
  deleteAllExpensesInGrp,
  deleteSingleExpense,
  getSingleExpense,
  updateExpense,
  findUserTotalInGrp,
} = require("../controllers/expense");
const router = express.Router();

const authMiddleware = require("../middlewares/authentication");
const csrfAuthMiddleware = require("../middlewares/csrfAuthMiddleware");

router.get(
  "/:groupID",
  authMiddleware,
  csrfAuthMiddleware,
  getAllExpenseInGroup
);
router.get(
  "/allExpenses/:groupID",
  authMiddleware,
  csrfAuthMiddleware,
  getAllExpenseInGroupWithoutFilters
);

router.post("/:groupID", authMiddleware, csrfAuthMiddleware, addNewExpense);

router.delete(
  "/deleteAllExpenses/:groupID",
  authMiddleware,
  csrfAuthMiddleware,
  deleteAllExpensesInGrp
);
router.delete(
  "/deleteExpense/:expenseID",
  authMiddleware,
  csrfAuthMiddleware,
  deleteSingleExpense
);

router.get(
  "/getExpense/:expenseID",
  authMiddleware,
  csrfAuthMiddleware,
  getSingleExpense
);

router.patch("/:expenseID", authMiddleware, csrfAuthMiddleware, updateExpense);

router.get(
  "/findBalance/:groupID",
  authMiddleware,
  csrfAuthMiddleware,
  findUserTotalInGrp
);

// router.post(
//   "/addToGroupList/:groupID",
//   authMiddleware,
//   csrfAuthMiddleware,
//   addGroupToUserGroups
// );

module.exports = router;
