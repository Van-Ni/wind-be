const User = require("../models/user");
const FriendRequest = require("../models/friendRequest");
const filterObj = require("../utils/filterObj");
const asyncHandler = require('express-async-handler')


exports.updateMe = asyncHandler(async (req, res, next) => {
    const filteredBody = filterObj(
        req.body,
        "firstName",
        "lastName",
        "about",
        "avatar"
    );

    const userDoc = await User.findByIdAndUpdate(req.user._id, filteredBody);

    res.status(200).json({
        status: "success",
        data: userDoc,
        message: "User Updated successfully",
    });
})

exports.getMe = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        status: "success",
        data: req.user,
    });
});

exports.getUsers = asyncHandler(async (req, res, next) => {
    const all_users = await User.find({
        verified: true,
    }).select("firstName lastName _id");

    const friendRequests = await FriendRequest.find({
        $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
        ]
    }).select("recipient sender");

    const this_user = req.user;

    let remaining_users = all_users.filter((user) => {
        const isFriend = this_user.friends.some(friend =>
            friend.equals(user._id)
        );
        const isRequested = friendRequests.some(request =>
            request?.sender.equals(user._id) || request?.recipient.equals(user._id)
        );

        return !isFriend && !isRequested && !user._id.equals(this_user._id);
    })
    res.status(200).json({
        status: "success",
        data: remaining_users,
        message: "Users found successfully!",
    });
})


exports.getRequests = asyncHandler(async (req, res, next) => {
    const requests = await FriendRequest.find({ recipient: req.user._id })
        .populate("sender", "_id firstName lastName")
        .select("_id");

    console.log("getRequests", requests);

    res.status(200).json({
        status: "success",
        data: requests || [],
        message: "Friends found successfully!",
    });
})

exports.getFriends = asyncHandler(async (req, res, next) => {
    const this_user = await User.findById(req.user._id).populate("friends", "_id firstName lastName");

    res.status(200).json({
        status: "success",
        data: this_user.friends || [],
        message: "Friends found successfully!",
    })
})