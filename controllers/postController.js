const cloudinary = require("../utils/cloudinary");
const Post = require("../models/post");
const filterObj = require("../utils/filterObj");
const asyncHandler = require('express-async-handler')
const fs = require('fs');
const main = require("../index");
//create post
exports.createPost = asyncHandler(async (req, res, next) => {
    const { content } = req.body;
    const file = req.file.path
    //upload image in cloudinary
    const result = await cloudinary.uploader.upload(file, {
        folder: "posts",
        width: 1200,
        crop: "scale"
    })
    const post = await Post.create({
        content,
        postedBy: req.user._id,
        image: {
            url: result.secure_url,
            public_id: result.public_id
        },

    });
    await fs.unlink(file, function (err) {
        if (err) throw err;
        console.log('delete');
    });

    res.status(201).json({
        success: true,
        data: post
    })
})
//show posts
exports.showPost = asyncHandler(async (req, res, next) => {
    try {
        const { page, limit } = req.pagination;
        const { sortBy, sortOrder } = req.sorting;
        const filters = req.filters;

        const startIndex = (page - 1) * limit;

        const query = Post.find(filters)
            .sort({ [sortBy]: sortOrder })
            .skip(startIndex)
            .limit(limit)
            .populate('postedBy', 'firstName lastName avatar');

        const totalItems = await Post.where(filters).countDocuments();
        const totalPages = Math.ceil(totalItems / limit);

        const posts = await query.exec();

        res.status(200).json({
            success: true,
            page,
            limit,
            totalItems,
            totalPages,
            data: posts,
        });
    } catch (error) {
        next(error);
    }
});
//show single post
exports.showSinglePost = asyncHandler(async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id).populate('comments.postedBy', 'firstName lastName avatar');
        res.status(200).json({
            success: true,
            data: post
        })
    } catch (error) {
        next(error);
    }
})

//delete post
exports.deletePost = asyncHandler(async (req, res, next) => {
    const currentPost = await Post.findById(req.params.id);

    //delete post image in cloudinary       
    const ImgId = currentPost.image.public_id;
    if (ImgId) {
        await cloudinary.uploader.destroy(ImgId);
    }
    await Post.findByIdAndRemove(req.params.id);
    res.status(200).json({
        success: true,
        message: "post deleted"
    })

})


//update post
exports.updatePost = asyncHandler(async (req, res, next) => {
    try {
        const { content } = req.body;
        const image = req.file.path;
        const currentPost = await Post.findById(req.params.id);

        //build the object data
        let data = {
            content: content || currentPost.content,
            image: currentPost.image,
        }

        //modify post image conditionally
        if (image !== '') {

            const ImgId = currentPost.image.public_id;
            if (ImgId) {
                await cloudinary.uploader.destroy(ImgId);
            }

            const newImage = await cloudinary.uploader.upload(image, {
                folder: 'posts',
                width: 1200,
                crop: "scale"
            });

            data.image = {
                public_id: newImage.public_id,
                url: newImage.secure_url
            }

        }

        const postUpdate = await Post.findByIdAndUpdate(req.params.id, data, { new: true });

        res.status(200).json({
            success: true,
            postUpdate
        })

    } catch (error) {
        next(error);
    }

})


//add like
exports.addLike = asyncHandler(async (req, res, next) => {
    const post = await Post.findByIdAndUpdate(req.params.id, {
        $addToSet: { likes: req.user._id }
    },
        { new: true }
    );
    main.io.emit('addlike', post);
    // const posts = await Post.find().sort({ createdAt: -1 }).populate('postedBy', 'name');

    res.status(200).json({
        success: true,
        data: post
    })
})

//remove like
exports.removeLike =asyncHandler(async (req, res, next) => {

    try {
        const post = await Post.findByIdAndUpdate(req.params.id, {
            $pull: { likes: req.user._id }
        },
            { new: true }
        );
        main.io.emit('removelike', post);
        // const posts = await Post.find().sort({ createdAt: -1 }).populate('postedBy', 'name');

        res.status(200).json({
            success: true,
            data: post
        })

    } catch (error) {
        next(error);
    }

})
