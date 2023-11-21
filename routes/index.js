const router = require("express").Router();

const authRoute = require('./auth');
const userRoute = require('./user');
const postRoute = require('./post');
const oneToOneRoute = require('./oneToOne');

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/post", postRoute);
router.use("/oneToOne", oneToOneRoute);

module.exports = router;