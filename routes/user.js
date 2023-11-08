const router = require("express").Router();


const authController = require("../controllers/authController");
const userController = require("../controllers/userController");



router.use(authController.protect);

router.patch("/update-me", userController.updateMe);
router.get("/get-me", userController.getMe);
router.get("/get-users", userController.getUsers);
router.get("/get-friends", userController.getFriends);
router.get("/get-requests", userController.getRequests);
router.post("/file-message", userController.fileMessage);
router.get("/download/:filePath(*)", userController.fileDownload);

module.exports = router;