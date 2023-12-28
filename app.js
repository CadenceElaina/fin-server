const config = require("./utils/config");
const express = require("express");
require("express-async-errors");
const app = express();
/* app.use(express.static('static')); */
const cors = require("cors");

const portfoliosRouter = require("./controllers/portfolios");
const watchlistsRouter = require("./controllers/watchlists");
const usersRouter = require("./controllers/users");
const loginRouter = require("./controllers/login");
const refreshTokenRouter = require("./controllers/refreshToken");

const middleware = require("./utils/middleware");
const logger = require("./utils/logger");
const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

logger.info("connecting to", config.MONGODB_URI);

mongoose
  .connect(config.MONGODB_URI)
  .then(() => {
    logger.info("connected to MongoDB");
  })
  .catch((error) => {
    logger.error("error connecting to MongoDB:", error.message);
  });

app.use(cors());
//app.use(express.static("build"));
app.use(express.json());
app.use(middleware.requestLogger);
app.use(middleware.tokenExtractor);
app.use(middleware.userExtractor);

app.use("/api/portfolios", middleware.userExtractor, portfoliosRouter);
app.use("/api/watchlists", middleware.userExtractor, watchlistsRouter);
app.use("/api/users", usersRouter);
app.use("/api/login", loginRouter);
app.use("/api/refreshToken", refreshTokenRouter);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app;
