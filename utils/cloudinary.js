const cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: 'dhuejyqwy', 
  api_key: '772736946375747', 
  api_secret: 'gk8fRFWvcH7uczY6NRbqxqNDNT8' 
});

// const storage = multer.diskStorage({
//   destination: path.join(__dirname,"uploads"),
//   filename: function (req, file, cb) {
//       // generate the public name, removing problematic characters
//       cb(null, new Date().getTime() + path.extname(file.originalname))
//   }
// })

module.exports = cloudinary;