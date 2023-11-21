const router = require("express").Router();
const oneToOneController = require("../controllers/oneToOneController");
const authController = require("../controllers/authController");

router.use(authController.protect);


router.put('/notification/:id', oneToOneController.updateNotification);

module.exports = router;