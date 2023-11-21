const OneToOneMessage = require("../models/OneToOneMessage");
const Notification = require("../models/notification");
const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose');
exports.updateNotification = asyncHandler(async function (req, res, next) {
    const messageId = req.params.id;

    const message = await OneToOneMessage.findById(messageId);

    if (!message) {
        return res.status(404).json({ message: 'Không tìm thấy tin nhắn.' });
    }
    console.log(message);

    // Xóa các thông báo
    await Notification.deleteMany({ _id: { $in: message.notifications } });

    message.notifications = [];
    await message.save();

    return res.json({ message: 'Thực hiện thành công các truy vấn Mongoose.' });

});