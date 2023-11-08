const path = require('path');

function isImageFile(filePath) {
  // Get the file extension
  const fileExtension = path.extname(filePath).toLowerCase();

  // Define valid image file extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

  // Check if the file extension is in the list of valid extensions
  return validExtensions.includes(fileExtension);
}

module.exports = {
    isImageFile
}