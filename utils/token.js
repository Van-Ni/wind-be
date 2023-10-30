const jwt = require("jsonwebtoken");
// this function will return you jwt token
const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
const signRefreshToken = (userId) => jwt.sign({ userIdRefresh: userId }, process.env.JWT_SECRET, { expiresIn: '2d' });

module.exports = {
    signToken,
    signRefreshToken
}