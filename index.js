const mongoose = require("mongoose");
const dotenv = require("dotenv");
const multer = require('multer');
const path = require('path')
dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down ...");
  process.exit(1); // Exit Code 1 indicates that a container shut down, either because of an application failure.
});

const app = require("./app");

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io"); // Add this
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");
const Notification = require("./models/notification");

// Add this
// Create an io server and allow for CORS from http://localhost:3000 with GET and POST methods
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(process.env.DATABASE, {
    // useNewUrlParser: true, // The underlying MongoDB driver has deprecated their current connection string parser. Because this is a major change, they added the useNewUrlParser flag to allow users to fall back to the old parser if they find a bug in the new parser.
    // useCreateIndex: true, // Again previously MongoDB used an ensureIndex function call to ensure that Indexes exist and, if they didn't, to create one. This too was deprecated in favour of createIndex . the useCreateIndex option ensures that you are using the new function calls.
    // useFindAndModify: false, // findAndModify is deprecated. Use findOneAndUpdate, findOneAndReplace or findOneAndDelete instead.
    // useUnifiedTopology: true, // Set to true to opt in to using the MongoDB driver's new connection management engine. You should set this option to true , except for the unlikely case that it prevents you from maintaining a stable connection.
  })
  .then((con) => {
    console.log("DB Connection successful");
  });

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`App running on port ${port} ...`);
});



io.on("connection", async (socket) => { // Fired upon a connection from client.
  //https://socket.io/docs/v3/client-initialization/#query
  console.log(JSON.stringify(socket.handshake.query));
  const user_id = socket.handshake.query['user_id'];

  console.log(`User connected ${socket.id}`);
  if (user_id != null && Boolean(user_id)) {
    try {
      await User.findByIdAndUpdate(user_id, {
        socket_id: socket.id,
        status: "Online",
      });
    } catch (e) {
      console.log(e);
    }
  }


  // We can write our socket event listeners in here...
  socket.on("friend_request", async (data) => { // Fired when a new namespace is created:
    const to = await User.findById(data.to).select("socket_id");
    const from = await User.findById(data.from).select("socket_id");

    //TODO :check if FriendRequest is already exists 
    const existingRequest = await FriendRequest.findOne({
      sender: data.from,
      recipient: data.to,
    });
    if (existingRequest) {
      // FriendRequest already exists, notify the sender
      io.to(from?.socket_id).emit("request_sent", {
        message: "Friend request already sent!",
      });
    } else {
      // create a friend request
      await FriendRequest.create({
        sender: data.from,
        recipient: data.to,
      });
      // emit event request received to recipient
      io.to(from?.socket_id).emit("request_sent", {
        message: "Request Sent successfully!",
      });
      io.to(to?.socket_id).emit("new_friend_request", {
        message: "New friend request received",
      });
    }
  });

  socket.on("unfriend_request", async (data) => {
    try {
      const userId = new mongoose.Types.ObjectId(data.user_id);
      const friendId = new mongoose.Types.ObjectId(data.friend_id);

      // Find and update the user document
      // Update friend document and user document in one operation
      const result = await User.updateMany(
        {
          $or: [
            { _id: friendId, friends: userId },
            { _id: userId, friends: friendId },
          ],
        },
        { $pull: { friends: { $in: [userId, friendId] } } }
      );

      // Check if the update was successful
      if (result.modifiedCount === 0) {
        socket.emit("request_not_found", {
          message: "Friend not found in the list of friends",
        });
        return;
      }

      // Emit success event
      socket.emit("deny_success", {
        message: "Unfriended successfully",
      });
    } catch (error) {
      console.error(error);
      // Handle any errors that occurred during the process
      socket.emit("socket_request_error", {
        message: "An error occurred while unfriending",
      });
    }
  });
  /**
   * from
   * to
   */
  socket.on("accept_request", async (data) => {
    // accept friend request => add ref of each other in friends array
    const request_doc = await FriendRequest.findById(data.request_id);

    // Check if request_doc doesn't exist
    if (!request_doc) {
      socket.emit("request_not_found", {
        message: "Friend request not found",
      });
      return;
    }

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    // delete this request doc
    // emit event to both of them

    // emit event request accepted to both
    io.to(sender?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
  });

  socket.on("deny_request", async (data) => {
    let request_doc = await FriendRequest.findById(data.request_id);

    // Check if request_doc doesn't exist
    if (!request_doc) {
      socket.emit("request_not_found", {
        message: "Friend request not found",
      });
      return;
    }
    request_doc = await FriendRequest.findByIdAndDelete(data.request_id);

    socket.emit("deny_success", {
      message: "Deleted successfully",
    });
  });
  socket.on("get_direct_conversations", async ({ user_id }, callback) => {
    const existing_conversations = await OneToOneMessage.find({
      participants: { $all: [user_id] },
      "notifications.read_by": { $exists: false }
    })
      .populate({
        path: "notifications",
        match: { "read_by": { $exists: false } },
        model: "Notification",
      }).populate("participants", "firstName lastName avatar _id email status");

    console.log("get_direct_conversations", existing_conversations);
    callback(existing_conversations);
  });

  socket.on("start_conversation", async (data) => {
    const { to, from } = data;
    // check if there is any existing conversation
    /**
     * https://www.mongodb.com/docs/manual/reference/operator/query/size/
     * https://www.mongodb.com/docs/manual/reference/operator/query/all/
     */
    const existing_conversations = await OneToOneMessage.find({
      participants: { $size: 2, $all: [to, from] },
    }).populate("participants", "firstName lastName _id email status");

    // no => create a new OneToOneMessage doc & emit event "start_chat" & send conversation details as payload
    if (existing_conversations.length === 0) {
      let new_chat = await OneToOneMessage.create({
        participants: [to, from],
      });

      new_chat = await OneToOneMessage.findById(new_chat).populate(
        "participants",
        "firstName lastName _id email status"
      );
      console.log("new chat", new_chat);
      socket.emit("start_chat", new_chat);
    }
    // yes => just emit event "start_chat" & send conversation details as payload
    else {
      console.log("existing_conversations[0])", existing_conversations[0]);
      socket.emit("start_chat", existing_conversations[0]);
    }
  });

  socket.on("get_messages", async (data, callback) => {
    try {
      const { messages } = await OneToOneMessage.findById(
        data.conversation_id
      ).select("messages");
      callback(messages);
    } catch (error) {
      console.log(error);
    }
  });
  // Handle incoming text/link messages
  socket.on("text_message", async (data) => {
    console.log("Received message:", data);

    // data: {to, from, text}

    const { message, conversation_id, from, to, type } = data;

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    // message => {to, from, type, created_at, text, file}

    let new_message = {
      to: to,
      from: from,
      type: type,
      created_at: Date.now(),
      text: message,
      receiverUser: {
        name: `${to_user.firstName} ${to_user.lastName}`,
        //TODO :
      }
    };

    /** TODO
     * @Feature : Notification
     * add notification in NotificationSchema
     * add id notification in oneToOneMessageSchema
     */
    // Create a new notification
    const notification = new Notification({
      sender: from_user._id,
      receiver: to_user._id,
      message: `New message from ${from_user.firstName} ${from_user.lastName}`,
    });

    // Save the notification to the database
    await notification.save({ new: true });

    // fetch OneToOneMessage Doc & push a new message to existing conversation
    const chat = await OneToOneMessage.findById(conversation_id);
    chat.messages.push(new_message);
    chat.notifications.push(notification._id);

    // save to db`
    await chat.save({ new: true, validateModifiedOnly: true });

    // Lấy message ID
    new_message._id = chat.messages[chat.messages.length - 1]._id;

    // emit incoming_message -> to user
    io.to(to_user?.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });

    // emit outgoing_message -> from user
    io.to(from_user?.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });
  });


  // handle Media/Document Message
  socket.on("file_message", (data) => {
    // Cấu hình Multer
    const storage = multer.diskStorage({
      destination: path.join(__dirname, "uploads"),
      filename: function (req, file, cb) {
        // generate the public name, removing problematic characters
        cb(null, new Date().getTime() + path.extname(file.originalname))
      }
    });
    const upload = multer({ storage });

    // data: {to, from, text, file}
    const { formData, conversation_id, from, to, type } = data;

    upload.single('file')(formData, null, (error) => {
      if (error) {
        console.log('Error uploading file:', error);
        callback({ success: false, message: 'Error uploading file' });
      } else {
        console.log('File uploaded successfully');
        callback({ success: true, message: 'File uploaded successfully' });
      }
    });

    // Get the file extension
    const fileExtension = path.extname(data.file.name);

    // Generate a unique filename
    const filename = `${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}${fileExtension}`;

    // upload file to AWS s3

    // create a new conversation if its dosent exists yet or add a new message to existing conversation

    // save to db

    // emit incoming_message -> to user

    // emit outgoing_message -> from user
  });
  // -------------- HANDLE SOCKET DISCONNECTION ----------------- //

  socket.on("end", async (data) => {
    // Find user by ID and set status as offline

    if (data.user_id) {
      await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
    }

    // broadcast to all conversation rooms of this user that this user is offline (disconnected)

    /** backlog 
     * - before end message send socket emit from client
     * data: {to, from, type : "Devide"}
     */
    console.log("closing connection");
    socket.disconnect(0);
  });
})

exports.io = io;


process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("UNHANDLED REJECTION! Shutting down ...");
  server.close(() => {
    process.exit(1); //  Exit Code 1 indicates that a container shut down, either because of an application failure.
  });
});
