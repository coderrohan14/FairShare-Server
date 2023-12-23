const express = require("express");
const {
  getAllGroups,
  addNewGroup,
  getSingleGroup,
  updateGroup,
  deleteGroup,
  deleteAllGroups,
  addUserToGroup,
} = require("../controllers/groups");
const router = express.Router();

const authMiddleware = require("../middlewares/authentication");
const csrfAuthMiddleware = require("../middlewares/csrfAuthMiddleware");

router.get("/", authMiddleware, csrfAuthMiddleware, getAllGroups);

router.post("/", authMiddleware, csrfAuthMiddleware, addNewGroup);

router.delete("/", authMiddleware, csrfAuthMiddleware, deleteAllGroups);

router.get("/:groupID", authMiddleware, csrfAuthMiddleware, getSingleGroup);

router.patch("/:groupID", authMiddleware, csrfAuthMiddleware, updateGroup);

router.delete("/:groupID", authMiddleware, csrfAuthMiddleware, deleteGroup);

router.post(
  "/addToGroupList/:groupID",
  authMiddleware,
  csrfAuthMiddleware,
  addUserToGroup
);

module.exports = router;
