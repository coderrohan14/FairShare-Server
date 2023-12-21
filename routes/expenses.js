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

router.get("/:groupID", authMiddleware, csrfAuthMiddleware, getAllExpenseInGroup);
router.get("/allexpense/:groupID", authMiddleware, csrfAuthMiddleware, getAllExpenseInGroupWithoutFilters);


router.post("/", authMiddleware, csrfAuthMiddleware, addNewExpense);

router.delete("/delgroup/:groupID", authMiddleware, csrfAuthMiddleware, deleteAllExpensesInGrp);
router.delete("/delexpense/:expenseID", authMiddleware, csrfAuthMiddleware, deleteSingleExpense);

router.get("/getexp/:expenseID", authMiddleware, csrfAuthMiddleware, getSingleExpense);

router.patch("/:expenseID", authMiddleware, csrfAuthMiddleware, updateExpense);

router.get("/findbalance/:groupID", authMiddleware, csrfAuthMiddleware, findUserTotalInGrp);

// router.post(
//   "/addToGroupList/:groupID",
//   authMiddleware,
//   csrfAuthMiddleware,
//   addGroupToUserGroups
// );

module.exports = router;
