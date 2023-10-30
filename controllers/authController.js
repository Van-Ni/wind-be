//Model
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const filterObj = require("../utils/filterObj");
const bcrypt = require("bcryptjs");
const CryptoJS = require("crypto-js");
const asyncHandler = require('express-async-handler')
const otpGenerator = require("otp-generator");
const sendMail = require('../utils/nodemailer')
const otp = require("../Templates/Mail/otp")
const resetPassword = require('../Templates/Mail/resetPassword');
const { signToken, signRefreshToken } = require("../utils/token");

//===============
//User Login
//===============
exports.login = asyncHandler(async function (req, res, next) {
    const { email, password } = req.body;


    if (!email || !password) {
        res.status(400).json({
            status: "error",
            message: "Both email and password are required",
        })
        return;
    }
    const user = await User.findOne({ email: email }).select("+password");

    if (!user || !user.password) {
        res.status(400).json({
            status: "error",
            message: "Incorrect password",
        });

        return;
    }
    if (!user || !(await bcrypt.compareSync(password, user.password))) {
        res.status(400).json({
            status: "error",
            message: "Email or password is incorrect",
        });

        return;
    }
    const token = signToken(user._id);

    // Tạo refresh token
    const newRefreshToken = signRefreshToken(user._id);
    // Lưu refresh token vào database
    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken }, { new: true })
    // Lưu refresh token vào cookie
    res.cookie("refreshToken", newRefreshToken, { maxAge: 2 * 24 * 60 * 60 * 1000, httpOnly: true });
    res.status(200).json({
        status: "success",
        message: "Logged in successfully!",
        token,
        user_id: user._id,
    });
})

//===============
//Register New User
//===============

exports.register = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, password } = req.body;

    const filteredBody = filterObj(
        req.body,
        "firstName",
        "lastName",
        "email",
        "password"
    );

    // check if a verified user with given email exists

    const existing_user = await User.findOne({ email: email });

    if (existing_user && existing_user.verified) {
        // user with this email already exists, Please login
        return res.status(400).json({
            status: "error",
            message: "Email already in use, Please login.",
        });
    } else if (existing_user) {
        // if not verified than update prev one

        await User.findOneAndUpdate({ email: email }, filteredBody, {
            new: true,
            validateModifiedOnly: true,
        });

        // generate an otp and send to email
        req.userId = existing_user._id;
        next();
    }
    else {
        // Hash mật khẩu trước khi tạo người dùng
        const hashedPassword = await bcrypt.hash(password, 12);
        filteredBody.password = hashedPassword;
        // if user is not created before than create a new one
        const new_user = await User.create(filteredBody);

        req.userId = new_user._id;
        // return res.status(201).json({
        //     status: "success",
        //     message: "Registered successfully",
        // });
        next();
    }
});
//===============
//sendOTP
//===============
exports.sendOTP = async (req, res, next) => {
    const { userId } = req;
    const new_otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
    });

    const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 Mins after otp is sent

    const user = await User.findByIdAndUpdate(userId, {
        otp_expiry_time: otp_expiry_time,
    });
    user.otp = await bcrypt.hash(new_otp.toString(), 12);

    await user.save({ new: true, validateModifiedOnly: true });

    console.log("new_otp", new_otp);

    // TODO send mail
    const rs = await sendMail({
        email: user.email,
        html: otp(`${user.firstName} ${user.firstName}`, new_otp),
        subject: "Verification OTP"
    })

    res.status(200).json({
        status: "success",
        message: "OTP Sent Successfully!",
        rs
    });
};

//===============
//verifyOTP
//===============
exports.verifyOTP = asyncHandler(async (req, res, next) => {
    // verify otp and update user accordingly
    const { email, otp } = req.body;
    const user = await User.findOne({
        email,
        otp_expiry_time: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).json({
            status: "error",
            message: "Email is invalid or OTP expired",
        });
    }

    if (user.verified) {
        return res.status(400).json({
            status: "error",
            message: "Email is already verified",
        });
    }
    const correctOTP = await bcrypt.compare(otp, user.otp);
    if (!correctOTP) {
        res.status(400).json({
            status: "error",
            message: "OTP is incorrect",
        });

        return;
    }

    // OTP is correct

    user.verified = true;
    user.otp = undefined;
    user.otp_expiry_time = undefined;
    await user.save({ new: true, validateModifiedOnly: true });

    const token = signToken(user._id);

    res.status(200).json({
        status: "success",
        message: "OTP verified Successfully!",
        token,
        user_id: user._id,
    });
});

// Protect
exports.protect = asyncHandler(async (req, res, next) => {
    // 1) Getting token and check if it's there
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({
            message: "You are not logged in! Please log in to get access.",
        });
    }
    // 2) Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    console.log(decoded);

    // 3) Check if user still exists

    const this_user = await User.findById(decoded.userId);
    if (!this_user) {
        return res.status(401).json({
            message: "The user belonging to this token does no longer exists.",
        });
    }

    // 4) Check if user changed password after the token was issued
    if (this_user.passwordChangedAt) {
        const changedTimeStamp = parseInt(
            this_user.passwordChangedAt.getTime() / 1000,
            10
        );
        if (decoded.iat < changedTimeStamp) {
            return res.status(401).json({
                message: "User recently changed password! Please log in again.",
            });
        }
        console.log("changedTimeStamp", changedTimeStamp);
    }
    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = this_user;
    next();
});


exports.forgotPassword = asyncHandler(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(404).json({
            status: "error",
            message: "There is no user with email address.",
        });
    }

    // 2) Generate the random reset token
    const resetToken = CryptoJS.lib.WordArray.random(32).toString();
    const passwordResetToken = CryptoJS.SHA256(resetToken).toString();
    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });


    // 3) Send it to user's email
    try {
        const resetURL = `${req.protocol}://${req.hostname}:${process.env.PORT}/auth/new-password?token=${resetToken}`;
        // TODO send mail
        const rs = await sendMail({
            email: user.email,
            html: resetPassword(`${user.firstName} ${user.lastName}`, resetURL),
            subject: "Reset Password",
        })
        res.status(200).json({
            status: "success",
            message: "Token sent to email!",
            rs
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return res.status(500).json({
            message: "There was an error sending the email. Try again later!",
        });
    }
});


exports.resetPassword = asyncHandler(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = CryptoJS.SHA256(req.body.token).toString();
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return res.status(400).json({
            status: "error",
            message: "Token is Invalid or Expired",
        });
    }
    user.password = await bcrypt.hash(req.body.password, 12);
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now() - 1000;
    await user.save();

    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    const token = signToken(user._id);

    res.status(200).json({
        status: "success",
        message: "Password Reseted Successfully",
        token,
    });
});

exports.refreshAccessToken = asyncHandler(async (req, res, next) => {
    // Lấy token từ cookies
    const cookie = req.cookies
    // Check xem có token hay không
    if (!cookie && !cookie.refreshToken) throw new Error('No refresh token in cookies')

    jwt.verify(cookie.refreshToken, process.env.JWT_SECRET, async (err, decode) => {
        if (err) throw new Error("Refresh token not matched");

        const response = await User.findOne({ _id: decode.userIdRefresh, refreshToken: cookie.refreshToken });
        return res.status(200).json({
            success: true,
            newAccessToken: signToken(response.userIdRefresh)
        })
    })
})

//oauth google
exports.googleSuccess = asyncHandler(async (req, res, next) => {
    const { user } = req;
    if (!user)
        res.redirect('/auth/callback/failure');
    const token = signToken(user._id);
    // res.cookie("accessToken", token, { maxAge: 2 * 24 * 60 * 60 * 1000, httpOnly: true });
    res.redirect(`${process.env.CLIENT_URL}/auth/verifyOauth/${user._id}/${token}`);
});