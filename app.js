const express = require("express");
require("express-async-errors");
require("dotenv").config();
const app = express();
const connectDB = require("./db/connect");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const passport = require("passport");
const authRouter = require("./routes/auth");
const groupsRouter = require("./routes/groups");
const expenseRouter = require("./routes/expenses");
const notFoundMiddleware = require("./middlewares/not-found");
const errorHandlerMiddleware = require("./middlewares/error-handler");

app.use(
  cookieParser({
    sameSite: "none",
  })
);

app.set("view engine", "ejs");

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,UPDATE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept"
  );
  next();
});

app.use("/auth", authRouter);
app.use("/groups", groupsRouter);
app.use("/expenses", expenseRouter);

app.get("/", (req, res) => {
  res.send("Welcome to the server...");
});

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 4000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server started on port ${port}...`);
    });
  } catch (err) {
    console.log(err);
  }
};

start();
