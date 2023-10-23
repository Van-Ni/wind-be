const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: path.join(process.cwd(), "uploads"),
    filename: function (req, file, cb) {
        // generate the public name, removing problematic characters
        cb(null, new Date().getTime() + path.extname(file.originalname));
    }
});

const uploadMiddleware = (fieldName) => {
    const upload = multer({ storage }).single(fieldName);
    return (req, res, next) => {
        upload(req, res, function (err) {
            if (err) {
                // Xử lý lỗi tải lên tệp tin
                return res.status(400).json({ error: 'Tải lên tệp tin thất bại' });
            }
            next();
        });
    };
};

module.exports = uploadMiddleware;