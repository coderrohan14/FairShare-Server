const express = require("express");
const {
  getAllGroups,
  addNewGroup,
  getSingleGroup,
  updateGroup,
  deleteGroup,
  deleteAllGroups,
  addUserToGroup,
  removeUserFromGroup,
  testNeo4J,
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

router.post("/testNeo4j/:userID/:groupID", testNeo4J);

router.post(
  "/addToGroupList/:groupID",
  authMiddleware,
  csrfAuthMiddleware,
  addUserToGroup
);

router.post(
  "/removeUser/:groupID",
  authMiddleware,
  csrfAuthMiddleware,
  removeUserFromGroup
);

module.exports = router;
