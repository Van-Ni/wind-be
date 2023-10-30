const router = require("express").Router();
const authController = require("../controllers/authController");
const postController = require("../controllers/postController");
const uploadMiddleware = require('../middlewares/upploadMiddleware'); 

router.use(authController.protect);

router.post('/', postController.createPost);
router.get('/', postController.showPost);
router.get('/:id', postController.showPost);
router.delete('/:id', postController.deletePost);
router.put('/:id', postController.updatePost);
router.get('/addlike/:id', postController.addLike);
router.get('/removelike/:id', postController.removeLike);

module.exports = router;