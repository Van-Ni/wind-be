const app = require('./app')
const mongoose = require('mongoose');
require('dotenv').config({ path: "./config.env" })

process.on("uncaughtException", (err) => {
  process.on("uncaughtException", (err) => {
    console.log(err);
    console.log("UNCAUGHT Exception! Shutting down ...");
    process.exit(1); // Exit Code 1 indicates that a container shut down, either because of an application failure.
  });
})


const http = require("http");

const port = process.env.PORT || 5000;

mongoose.connect(process.env.DATABASE).then((conn) => {
  console.log('DB Connection Successful');
}).catch((error) => {
  console.log('Some error has occured');
});


const server = http.createServer(app);

server.listen(port, () => {
  console.log(`App running on port ${port} ...`);
})



process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("UNHANDLED REJECTION! Shutting down ...");
  server.close(() => {
    process.exit(1); //  Exit Code 1 indicates that a container shut down, either because of an application failure.
  });
});
