const Group = require("../models/Group");
const { BadRequestError, NotFoundError } = require("../errors");

const getAllGroups = async (req, res) => {
  const groups = await Group.find();
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
  const { name, members } = await req.body;
  const { userID } = await user;
  if (!name || !userID) {
    throw new BadRequestError(
      "Please provide all the necessary information for the Group."
    );
  }
  if (!members) members = [];
  const group = await Group.create({ name, members });
  if (group) {
    const result = await User.findOneAndUpdate(
      { _id: userID },
      { $push: { groups: group._id } },
      { new: true } // Return the updated document
    );
    if (result) {
      res.status(201).json({
        success: true,
        group,
      });
    } else {
      await Group.findOneAndRemove({ _id: group._id });
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
  if (deletionResult.ok === 1 && deletionResult.deletedCount > 0) {
    await User.updateMany({}, { $set: { groups: [] } });
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
  const { name, members } = await req.body;
  const updateBody = {};
  if (name) updateBody.name = name;
  if (members) updateBody.members = members;
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
};

const deleteGroup = async (req, res) => {
  const { groupID } = await req.params;
  const deletedGroup = await Group.findOneAndRemove({ _id: groupID });
  if (deletedGroup) {
    // Get the members of the deleted group
    const membersToUpdate = deletedGroup.members;

    // Update users to remove the deleted group's ID from their groups list
    await User.updateMany(
      { _id: { $in: membersToUpdate } },
      { $pull: { groups: groupID } }
    );

    res.status(200).json({
      success: true,
      deletedGroup,
    });
  } else {
    res.status(500).json({
      success: false,
      msg: "Unable to delete the group, please try again later.",
    });
  }
};

const addGroupToUserGroups = async (req, res) => {
  const { userID } = await user;
  const { groupID } = await req.params;
  if (!userID || !groupID) {
    throw new BadRequestError("Please provide all the necessary information.");
  }
  const updatedUser = await User.findByIdAndUpdate(
    userID,
    { $addToSet: { groups: groupID } },
    { new: true }
  );
  if (updatedUser) {
    res.status(200).json({ success: true, updatedUser });
  } else {
    res.status(500).json({
      success: false,
      msg: "Unable to update the user, please try again later.",
    });
  }
};

module.exports = {
  getAllGroups,
  addNewGroup,
  deleteAllGroups,
  getSingleGroup,
  updateGroup,
  deleteGroup,
  addGroupToUserGroups,
};
