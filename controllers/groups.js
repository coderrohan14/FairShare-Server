const Group = require("../models/Group");
const User = require("../models/User");
const Expense = require("../models/Expense");
const { BadRequestError, NotFoundError } = require("../errors");
const { default: mongoose } = require("mongoose");
const { connectNeo4j } = require("../db/connect");

const getAllGroups = async (req, res) => {
  const { userID } = await req.body.user;
  const groups = await Group.find({
    members: { $in: [userID] },
  });
  if (groups) {
    res.status(200).json({ success: true, groups });
  } else {
    res.status(404).json({
      success: false,
      msg: "Unable to fetch the groups at this time, please try again later.",
    });
  }
};

const addNewGroup = async (req, res) => {
  const { user, name } = await req.body;
  const { userID } = await user;
  if (!name || !userID) {
    throw new BadRequestError(
      "Please provide all the necessary information for the Group."
    );
  }
  const members = [userID];
  const group = await Group.create({ name, members });
  if (group) {
    const result = await User.findOneAndUpdate(
      { _id: userID },
      { $push: { groups: group._id } },
      { new: true } // Return the updated document
    );
    if (result) {
      //.......Neo4j Update.........
      const driver = await connectNeo4j();
      //query
      const statement = "MERGE (u:User {userID: $userID, groupID: $groupID})";
      const params = { userID, groupID: group._id };
      const result = await driver.executeQuery(statement, params, {
        database: "neo4j",
      });
      await driver.close();
      //.......Neo4j Update.........

      res.status(201).json({
        success: true,
        group,
      });
    } else {
      await Group.findOneAndDelete({ _id: group._id });
      res.status(500).json({
        success: false,
        msg: "Unable to create the group, please try again later.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "Unable to create the group, please try again later.",
    });
  }
};

const deleteAllGroups = async (req, res) => {
  const deletionResult = await Group.deleteMany({});
  if (deletionResult.acknowledged && deletionResult.deletedCount > 0) {
    await User.updateMany({}, { $set: { groups: [] } });
    await Expense.deleteMany({});
    res.status(200).json({
      success: true,
      msg: "All the groups deleted successfully!",
    });
  } else {
    res.status(500).json({
      success: false,
      msg: "Deletion failed or no documents were deleted.",
    });
  }
};

const getSingleGroup = async (req, res) => {
  const { groupID } = await req.params;
  const group = await Group.findOne({ _id: groupID });
  if (group) {
    res.status(200).json({ success: true, group });
  } else {
    throw new NotFoundError("No group found with the given groupID.");
  }
};

const updateGroup = async (req, res) => {
  const { groupID } = await req.params;
  const { name, members, user } = await req.body;
  const { userID } = await user;
  const updateBody = {};
  if (name) updateBody.name = name;
  if (members) updateBody.members = members;
  const group = await Group.find({
    _id: groupID,
    members: { $in: [new mongoose.Types.ObjectId(userID)] },
  });
  if (group) {
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupID },
      updateBody,
      {
        new: true,
        runValidators: true,
      }
    );
    if (updatedGroup) {
      res.status(200).json({ success: true, updatedGroup });
    } else {
      res.status(500).json({
        success: false,
        msg: "Unable to update the group, please try again later.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "You are not authorized to update this group.",
    });
  }
};

const deleteGroup = async (req, res) => {
  const { groupID } = await req.params;
  const { userID } = await req.body.user;
  const group = await Group.findOne({
    _id: groupID,
    members: { $in: [new mongoose.Types.ObjectId(userID)] },
  });
  if (group) {
    const deletedGroup = await Group.findOneAndDelete({ _id: groupID });
    if (deletedGroup) {
      // Get the members of the deleted group
      const membersToUpdate = deletedGroup.members;

      // Update users to remove the deleted group's ID from their groups list
      await User.updateMany(
        { _id: { $in: membersToUpdate } },
        { $pull: { groups: groupID } }
      );

      await Expense.deleteMany({
        grp_id: groupID,
      });

      res.status(200).json({
        success: true,
        msg: "Successfully deleted the group.",
      });
    } else {
      res.status(500).json({
        success: false,
        msg: "Unable to delete the group, please try again later.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "You are not authorized to delete this group.",
    });
  }
};

const addUserToGroup = async (req, res) => {
  const { userID, user } = await req.body;
  const currentUserID = user.userID;
  const { groupID } = await req.params;
  if (!userID || !groupID || !currentUserID) {
    throw new BadRequestError("Please provide all the necessary information.");
  }

  const group = await Group.findOne({
    _id: groupID,
    members: { $in: [new mongoose.Types.ObjectId(currentUserID)] },
  });

  if (group) {
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupID },
      { $push: { members: userID } },
      { new: true } // Return the updated document
    );
    if (updatedGroup) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userID },
        { $push: { groups: groupID } },
        { new: true } // Return the updated document
      );
      if (updatedUser) {
        //.......Neo4j Update.........
        const driver = await connectNeo4j();
        //query
        const statement = "MERGE (u:User {userID: $userID, groupID: $groupID})";
        const params = { userID, groupID };
        const result = await driver.executeQuery(statement, params, {
          database: "neo4j",
        });
        await driver.close();
        //.......Neo4j Update.........

        res.status(200).json({
          success: true,
          msg: "User added to the group successfully.",
        });
      } else {
        res.status(500).json({
          success: false,
          msg: "Unable to add this user to the given group, please try again later.",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        msg: "Unable to add this user to the given group, please try again later.",
      });
    }
  } else {
    res.status(500).json({
      success: false,
      msg: "You are not authorized to add users to this group.",
    });
  }
};

const testNeo4J = async (req, res) => {
  const { userID, groupID } = req.params;
  console.log(userID, groupID);
  //.......Neo4j Update.........
  const driver = await connectNeo4j();
  //query
  const statement = "MERGE (u:User {userID: $userID, groupID: $groupID})";
  const params = { userID, groupID };
  const result = await driver.executeQuery(statement, params, {
    database: "neo4j",
  });
  await driver.close();
  //.......Neo4j Update.........

  res.status(200).json({
    success: true,
    result,
  });
};

module.exports = {
  getAllGroups,
  addNewGroup,
  deleteAllGroups,
  getSingleGroup,
  updateGroup,
  deleteGroup,
  addUserToGroup,
  testNeo4J,
};
