const User = require("../models/user");
const OneToOneMessage = require("../models/OneToOneMessage");
const FriendRequest = require("../models/friendRequest");
const filterObj = require("../utils/filterObj");
const cloudinary = require("../utils/cloudinary");
const asyncHandler = require('express-async-handler')
const fs = require('fs');
const http = require('http');
const path = require('path')
const main = require("../index");
const { isImageFile } = require('../utils/validate');
exports.updateMe = asyncHandler(async (req, res, next) => {
    const { _id } = req.user;
    const { firstName, lastName } = req.body;
    const file = req?.file?.path;
    const currentUser = await User.findById(_id);

    let data = {
        firstName: firstName || currentUser.firstName,
        lastName: lastName || currentUser.lastName,
        avatar: currentUser?.avatar,
    }

    if (file && file !== undefined) {

        const ImgId = currentUser.avatar.public_id;
        if (ImgId) {
            await cloudinary.uploader.destroy(ImgId);
        }

        const newImage = await cloudinary.uploader.upload(file, {
            folder: 'users',
            width: 1200,
            crop: "scale"
        });
        await fs.unlink(file, function (err) {
            if (err) throw err;
            console.log('delete');
        });
        data.avatar = {
            public_id: newImage.public_id,
            url: newImage.secure_url
        }
    }
    const userUpdate = await User.findByIdAndUpdate(_id, data, { new: true });

    res.status(200).json({
        success: true,
        userUpdate
    })
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
    }).select("firstName lastName _id avatar.url");

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
        .populate("sender", "_id firstName lastName avatar.url")
        .select("_id");

    console.log("getRequests", requests);

    res.status(200).json({
        status: "success",
        data: requests || [],
        message: "Friends found successfully!",
    });
})

exports.getFriends = asyncHandler(async (req, res, next) => {
    const this_user = await User.findById(req.user._id).populate("friends", "_id firstName lastName avatar.url");

    res.status(200).json({
        status: "success",
        data: this_user.friends || [],
        message: "Friends found successfully!",
    })
})

exports.fileMessage = asyncHandler(async (req, res, next) => {
    const { conversation_id,
        from,
        to,
        type } = req.body;
    const file = req.file.path;
    let result = {};
    if (isImageFile(file)) {
        //upload image in cloudinary
        result = await cloudinary.uploader.upload(file, {
            folder: "images",
            width: 1200,
            crop: "scale"
        })
        await fs.unlink(file, function (err) {
            if (err) throw err;
            console.log('delete');
        });
    }
    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    let new_message = {
        to: to,
        from: from,
        type: type,
        created_at: Date.now(),
        file: result.secure_url ? result.secure_url : file,
    };
    // fetch OneToOneMessage Doc & push a new message to existing conversation
    const chat = await OneToOneMessage.findById(conversation_id);
    chat.messages.push(new_message);

    await chat.save({ new: true, validateModifiedOnly: true });

    // Lấy message ID
    new_message._id = chat.messages[chat.messages.length - 1]._id;

    main.io.to(to_user?.socket_id).emit("new_message", {
        conversation_id,
        message: new_message,
    });

    // emit outgoing_message -> from user
    main.io.to(from_user?.socket_id).emit("new_message", {
        conversation_id,
        message: new_message,
    });

    return res.status(201).json({
        success: true,
        // data: chatMessage
    })
})


exports.fileDownload = asyncHandler(async (req, res, next) => {
    var file = req.params.filePath;
    res.download(file, "file.docx");
    // const { filePath } = req.params; // Đường dẫn tới file bạn muốn tải xuống

    // // Kiểm tra xem file có tồn tại không
    // if (!fs.existsSync(filePath)) {
    //     res.status(404).send('File not found');
    //     return;
    // }

    // // Lấy thông tin về file (ví dụ: tên file)
    // const fileName = path.basename(filePath);

    // // Thiết lập header để trình duyệt hiểu rằng đây là file tải xuống
    // res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    // res.setHeader('Content-Type', 'application/octet-stream');

    // // Đọc nội dung file và gửi nó về trình duyệt
    // const fileStream = fs.createReadStream(filePath);
    // fileStream.pipe(res);
});

exports.download = (url, dest, cb) => {

};