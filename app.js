const express = require("express"); // web framework for Node.js.
const morgan = require("morgan"); // HTTP request logger middleware for node.js

const routes = require("./routes/index");

const rateLimit = require("express-rate-limit"); // Basic rate-limiting middleware for Express. Use to limit repeated requests to public APIs and/or endpoints such as password reset.

const helmet = require("helmet"); // Helmet helps you secure your Express apps by setting various HTTP headers. It's not a silver bullet, but it can help!

const mongosanitize = require("express-mongo-sanitize"); // This module searches for any keys in objects that begin with a $ sign or contain a ., from req.body, req.query or req.params.

// By default, $ and . characters are removed completely from user-supplied input in the following places:
// - req.body
// - req.params
// - req.headers
// - req.query

const bodyParser = require("body-parser");

//cho phép các yêu cầu từ các domain khác có thể truy cập vào các tài nguyên của bạn
const cors = require("cors"); // CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.



const app = express();

app.use(
    cors({
        origin: "*",

        methods: ["GET", "PATCH", "POST", "DELETE", "PUT"],

        credentials: true, //

        //   Access-Control-Allow-Credentials is a header that, when set to true , tells browsers to expose the response to the frontend JavaScript code. The credentials consist of cookies, authorization headers, and TLS client certificates.
    })
);


//sử dụng để phân tích dữ liệu form và đưa vào req.body.
app.use(express.urlencoded({ extended: false }));
// sẽ được sử dụng để phân tích dữ liệu JSON và đưa vào req.body.
app.use(express.json({ limit: "10kb" }));

if (process.env.NODE_ENV == "development") {
    app.use(morgan("dev"));
}

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 60 minutes)
    message: "Too many Requests from this IP, please try again in an hour!",
})

app.use("/tawk", limiter);

app.use(
    express.urlencoded({
        extended: true,
    })
); // Returns middleware that only parses urlencoded bodies
app.use(mongosanitize());

// app.use(xss());
app.use(routes);
app.all("*", (req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: ` Somthing wrong!`
    })
})
app.use(helmet());
module.exports = app;