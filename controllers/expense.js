const Expense = require("../models/Expense");
const Group = require("../models/Group");
const { BadRequestError, NotFoundError } = require("../errors");
const { connectNeo4j } = require("../db/connect");

const getAllExpenseInGroup = async (req, res) => {
  const { page, sortBy } = await req.query;
  const { groupID } = await req.params;
  const { userID } = await req.body.user;
  const pageQuery = Number(page) || 1;
  const limitQuery = 10;
  const skipBy = (pageQuery - 1) * limitQuery;
  const sortByQuery = sortBy ? sortBy : "-dateAdded";
  const group = await Group.find({
    _id: groupID,
    members: { $in: [userID] },
  });
  if (group) {
    const expenses = await Expense.find({ grp_id: groupID })
      .sort(sortByQuery)
      .skip(skipBy)
      .limit(limitQuery);
    if (expenses) {
      res.status(200).json({ success: true, expenses });
    } else {
      res.status(404).json({
        success: false,
        msg: "Unable to fetch all expenses in group at this time, please try again later.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "You are not authorized to access the expenses of this group.",
    });
  }
};

//Test Function, delete before deploying
const getAllExpenseInGroupWithoutFilters = async (req, res) => {
  const { groupID } = await req.params;
  const expenses = await Expense.find({ grp_id: groupID });
  if (expenses) {
    res.status(200).json({ success: true, expenses });
  } else {
    res.status(404).json({
      success: false,
      msg: "Unable to fetch all expenses in group at this time, please try again later.",
    });
  }
};

// OPTIONAL: check whether the borrowers and lender lists contain users present in the given group
const addNewExpense = async (req, res) => {
  let { name, amount, borrowingList, lenderList, categoryName, user } =
    await req.body;
  const { groupID } = await req.params;
  const { userID } = await user;
  if (
    !name ||
    !userID ||
    !groupID ||
    !borrowingList ||
    !lenderList ||
    !amount
  ) {
    throw new BadRequestError(
      "Please provide all the necessary information for the Expense."
    );
  }
  const group = await Group.findOne({
    _id: groupID,
    members: { $in: [userID] },
  });
  if (group) {
    if (checkValidExpense(borrowingList, lenderList, amount)) {
      // logic to divide expenses
      const expense = await Expense.create({
        name,
        amount,
        grp_id: groupID,
        borrowingList,
        lenderList,
        categoryName,
        addedByUser: userID,
      });
      if (expense) {
        await addExpenseNeo4J(lenderList, borrowingList, groupID);

        // Run simplifyDebts in the background
        (async () => {
          await simplifyDebts(groupID);
        })();

        res.status(201).json({
          success: true,
          msg: "Expense added successfully.",
        });
      } else {
        res.status(500).json({
          success: false,
          msg: "Unable to add the expense, please try again later.",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        msg: "The given expense is invalid, please try again.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "No group found with the given groupID or you are not authorized to add expenses to this group.",
    });
  }
};

// Test Function, delete before deploying...
const deleteAllExpensesInGrp = async (req, res) => {
  const { groupID } = await req.params;
  const deletionResult = await Expense.deleteMany({ grp_id: groupID });
  if (deletionResult.acknowledged && deletionResult.deletedCount > 0) {
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
  const { userID } = await req.body.user;
  const { expenseID } = await req.params;
  const expense = await Expense.findOne({
    _id: expenseID,
  });
  if (expense) {
    const groupID = expense.grp_id;
    const group = await Group.findOne;
    ({
      _id: groupID,
      members: { $in: [userID] },
    });
    if (group) {
      const deletedExpense = await Expense.findOneAndDelete({
        _id: expenseID,
      });
      // perform neo4j updates
      const { lenderList, borrowingList } = expense;
      const updatedLenderList = lenderList.map((item) => ({
        userID: item.userID,
        amount: parseFloat(item.amount.toString()),
      }));
      const updatedBorrowerList = borrowingList.map((item) => ({
        userID: item.userID,
        amount: parseFloat(item.amount.toString()),
      }));
      // pass swapped lenderList and borrowringList to nulify the expense
      await addExpenseNeo4J(updatedBorrowerList, updatedLenderList, groupID);

      // Run simplifyDebts in the background
      (async () => {
        await simplifyDebts(groupID);
      })();

      if (deletedExpense) {
        res.status(200).json({
          success: true,
          msg: "Expense deleted successfully.",
        });
      } else {
        res.status(500).json({
          success: false,
          msg: "Unable to delete this expense, please try again later.",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        msg: "You are not authorized to delete this expense.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "No such expense found.",
    });
  }
};

const settleUp = async (req, res) => {
  const { groupID } = req.params;
  const { user, senderID, receiverID, amount } = await req.body;
  const { userID } = await user;
  console.log(userID, senderID, receiverID);
  if (userID === senderID || userID === receiverID) {
    const oweList = (await getOwedAmountsForUser(senderID, groupID))
      .outgoingList;

    const matchingEntry = oweList.find(
      (entry) => entry.userID === receiverID && entry.amount >= amount
    );

    if (matchingEntry) {
      // settle this amount
      const driver = await connectNeo4j();
      let statement = "";
      if (amount == matchingEntry.amount) {
        // delete edge
        statement =
          "MATCH \
           (sender:User {userID: $senderID, groupID: $groupID})-[owes:OWES]->(receiver:User{userID: $receiverID, groupID: $groupID}) \
           DELETE owes";
      } else {
        // update edge amount
        statement =
          "MATCH \
           (sender:User {userID: $senderID, groupID: $groupID})-[owes:OWES]->(receiver:User {userID: $receiverID, groupID: $groupID}) \
           SET owes.amount = owes.amount - $amount";
      }
      params = {
        senderID,
        receiverID,
        amount,
        groupID,
      };
      await driver.executeQuery(statement, params, {
        database: "neo4j",
      });
      await driver.close();
      res.status(200).json({
        success: true,
        msg: "Settle operation successful.",
      });
    } else {
      res.status(500).json({
        success: false,
        msg: "This settle operation is invalid.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "You are not authorized to settle this amount.",
    });
  }
};

const getSingleExpense = async (req, res) => {
  const { expenseID } = await req.params;
  const expense = await Expense.findOne({ _id: expenseID });
  if (expense) {
    res.status(200).json({ success: true, expense });
  } else {
    throw new NotFoundError("No expense found with the given expenseID.");
  }
};

const updateExpense = async (req, res) => {
  const { expenseID } = await req.params;
  let { name, amount, borrowingList, lenderList, categoryName, user } =
    await req.body;
  const { userID } = await user;
  const expense = await Expense.findOne({
    _id: expenseID,
  });
  if (expense) {
    const groupID = expense.grp_id;
    const group = await Group.findOne;
    ({
      _id: groupID,
      members: { $in: [userID] },
    });
    if (group) {
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
        if (lenderList || borrowingList) {
          const prevLenderList = expense.lenderList;
          const prevBorrowingLinst = expense.borrowingList;
          const updatedLenderList = prevLenderList.map((item) => ({
            userID: item.userID,
            amount: parseFloat(item.amount.toString()),
          }));
          const updatedBorrowerList = prevBorrowingLinst.map((item) => ({
            userID: item.userID,
            amount: parseFloat(item.amount.toString()),
          }));
          // pass swapped lenderList and borrowringList to nulify the expense
          await addExpenseNeo4J(
            updatedBorrowerList,
            updatedLenderList,
            groupID
          );
          if (!lenderList) lenderList = updatedLenderList;
          if (!borrowingList) borrowingList = updatedBorrowerList;
          await addExpenseNeo4J(lenderList, borrowingList, groupID);

          // Run simplifyDebts in the background
          (async () => {
            await simplifyDebts(groupID);
          })();
        }
        res
          .status(200)
          .json({ success: true, msg: "Expense updated successfully." });
      } else {
        res.status(500).json({
          success: false,
          msg: "Unable to update the Expense, please try again later.",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        msg: "You are not authorized to delete this expense.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "No such expense found.",
    });
  }
};

const findUserTotalInGrp = async (req, res) => {
  const { userID } = await req.body.user;
  const { groupID } = await req.params;

  if (!userID || !groupID) {
    throw new BadRequestError("Please provide all the necessary information.");
  }

  const group = await Group.findOne({
    _id: groupID,
    members: { $in: [userID] },
  });
  if (group) {
    const owed = await getOwedAmountsForUser(userID, groupID);
    if (owed) {
      let balance = 0;
      owed.incomingList.forEach((entry) => (balance += entry.amount));
      owed.outgoingList.forEach((entry) => (balance -= entry.amount));
      res.status(200).json({
        success: true,
        balance,
        owed,
      });
    } else {
      res.status(500).json({
        success: false,
        msg: "Unable to get the total balance, please try again later.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "You or the requested user is not a part of the given group.",
    });
  }
};

const getAllBalances = async (req, res) => {
  const { groupID } = await req.params;
  const driver = await connectNeo4j();
  //query
  let statement =
    "MATCH (n:User {groupID: $groupID})\
    OPTIONAL MATCH (n)<-[incoming:OWES]-(other:User)\
    WITH n, SUM(incoming.amount) AS incomingSum\
    OPTIONAL MATCH (n)-[outgoing:OWES]->(other:User)\
    WITH n, incomingSum, SUM(outgoing.amount) AS outgoingSum\
    RETURN n.userID AS userID, n.groupID AS groupID, toInteger(incomingSum - outgoingSum) AS balance";
  let params = {
    groupID: groupID.toString(),
  };
  let result = await driver.executeQuery(statement, params, {
    database: "neo4j",
  });

  //.......Neo4j Update.........
  const mappedResult = result.records.map((item) => ({
    userID: item._fields[item._fieldLookup.userID],
    groupID: item._fields[item._fieldLookup.groupID],
    balance: parseInt(item._fields[item._fieldLookup.balance].toString()),
  }));

  await driver.close();

  res.status(200).json({
    success: true,
    mappedResult,
  });
};

//.....UTIL FUNCTIONS....

async function addExpenseNeo4J(lenderList, borrowingList, groupID) {
  let curLender = lenderList.pop();
  for (const borrower of borrowingList) {
    while (borrower.amount != 0 && curLender) {
      if (curLender.amount === 0) curLender = lenderList.pop();
      if (!curLender) break;
      if (curLender.amount < borrower.amount) {
        // Update with curLender.amount
        borrower.amount -= curLender.amount;
        await addEdge(
          borrower.userID,
          curLender.userID,
          curLender.amount,
          groupID
        );
        curLender.amount = 0;
      } else {
        // Update with borrower.amount
        curLender.amount -= borrower.amount;
        await addEdge(
          borrower.userID,
          curLender.userID,
          borrower.amount,
          groupID
        );
        borrower.amount = 0;
      }
    }
  }
}

async function addEdge(borrowerID, lenderID, amount, groupID) {
  const driver = await connectNeo4j();
  //query
  const statement =
    "MATCH (borrower:User {userID: $borrowerID, groupID: $groupID}) \
     MATCH (lender:User {userID: $lenderID, groupID: $groupID}) \
     MERGE (borrower)-[owes:OWES]->(lender) \
     SET owes.amount = COALESCE(owes.amount, 0) + $amount";
  const params = {
    borrowerID: borrowerID.toString(),
    lenderID: lenderID.toString(),
    groupID: groupID.toString(),
    amount: amount,
  };
  await driver.executeQuery(statement, params, {
    database: "neo4j",
  });
  await driver.close();
}

function checkValidExpense(borrowingList, lenderList, amount) {
  const sum1 = borrowingList.reduce((sum, { amount }) => sum + amount, 0);
  const sum2 = lenderList.reduce((sum, { amount }) => sum + amount, 0);
  return sum1 === sum2 && sum1 === amount && sum1 !== 0;
}

async function simplifyDebts(groupID) {
  //.......Neo4j Update.........
  const driver = await connectNeo4j();
  //query
  let statement =
    "MATCH (n:User {groupID: $groupID}) \
     OPTIONAL MATCH (n)<-[incoming:OWES]-(other:User) \
     WITH n, SUM(incoming.amount) AS incomingSum \
     OPTIONAL MATCH (n)-[outgoing:OWES]->(other:User) \
     WITH n, incomingSum, SUM(outgoing.amount) AS outgoingSum \
     RETURN n.userID AS userID, n.groupID AS groupID, incomingSum - outgoingSum AS balance";
  let params = {
    groupID: groupID.toString(),
  };
  let result = await driver.executeQuery(statement, params, {
    database: "neo4j",
  });

  //.......Neo4j Update.........
  const mappedResult = result.records.map((item) => ({
    userID: item._fields[item._fieldLookup.userID],
    groupID: item._fields[item._fieldLookup.groupID],
    balance: item._fields[item._fieldLookup.balance],
  }));

  const borrowers = [],
    lenders = [];
  mappedResult.forEach((node) => {
    if (node.balance > 0) {
      lenders.push({
        userID: node.userID,
        groupID: node.groupID,
        amount: node.balance,
      });
    } else if (node.balance < 0) {
      borrowers.push({
        userID: node.userID,
        groupID: node.groupID,
        amount: -node.balance,
      });
    }
  });

  // Remove all existing relations in this group...
  statement = "MATCH (u:User {groupID: $groupID})-[r]-() DELETE r;";
  params = { groupID: groupID.toString() };

  result = await driver.executeQuery(statement, params, {
    database: "neo4j",
  });

  await driver.close();

  // add simplified debts to the graph...
  await addExpenseNeo4J(lenders, borrowers, groupID);
}

async function getOwedAmountsForUser(userID, groupID) {
  const driver = await connectNeo4j();
  let statement =
    "MATCH (user:User {userID: $userID, groupID: $groupID}) \
     WITH user \
     MATCH (user)-[outgoing:OWES]->(outgoingUser:User) \
     RETURN COLLECT({ userID: outgoingUser.userID, amount: outgoing.amount }) AS outgoingList";
  const params = { userID: userID.toString(), groupID: groupID.toString() };
  let result = await driver.executeQuery(statement, params, {
    database: "neo4j",
  });
  const outgoingList = result.records[0]._fields[0];
  statement =
    "MATCH (user:User {userID: $userID, groupID: $groupID}) \
     WITH user \
     MATCH (incomingUser:User)-[incoming:OWES]->(user) \
     RETURN COLLECT({ userID: incomingUser.userID, amount: incoming.amount }) AS incoming";
  result = await driver.executeQuery(statement, params, {
    database: "neo4j",
  });
  const incomingList = result.records[0]._fields[0];
  await driver.close();
  return { outgoingList, incomingList };
}

//....UTIL FUNCTIONS....

module.exports = {
  getAllExpenseInGroup,
  getAllExpenseInGroupWithoutFilters,
  addNewExpense,
  deleteAllExpensesInGrp,
  deleteSingleExpense,
  getSingleExpense,
  updateExpense,
  findUserTotalInGrp,
  getAllBalances,
  getOwedAmountsForUser,
  settleUp,
};
