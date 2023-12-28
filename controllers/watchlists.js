const config = require("../utils/config");
const watchlistsRouter = require("express").Router();
const Watchlist = require("../models/watchlist");
const User = require("../models/user");
const middleware = require("../utils/middleware");
const jwt = require("jsonwebtoken");

watchlistsRouter.get("/", async (request, response) => {
  const watchlists = await Watchlist.find({}).populate("user", {
    username: 1,
    name: 1,
  });

  response.json(watchlists);
});

watchlistsRouter.get("/:id", async (request, response) => {
  const watchlist = await Watchlist.findById(request.params.id);
  if (watchlist) {
    response.json(watchlist);
  } else {
    response.status(404).end();
  }
});

watchlistsRouter.post("/", async (request, response) => {
  const body = request.body;
  const user = request.user;
  const token = request.token;
  //console.log(body.title, body.author, user);
  const decodedToken = jwt.verify(token, config.SECRET);
  if (!(token && decodedToken.id)) {
    return response.status(401).json({ error: "token missing or invalid" });
  }

  const watchlist = new Watchlist({
    title: body.title,
    author: body.author,
    user: user._id,
  });

  const savedWatchlist = await watchlist.save();
  user.watchlists = user.watchlists || [];

  user.watchlists = user.watchlists.concat(savedWatchlist._id);
  await user.save();
  response.status(201).json(savedWatchlist.toJSON());
});

watchlistsRouter.delete("/:id", async (request, response) => {
  const token = request.token;
  const decodedToken = jwt.verify(token, config.SECRET);
  if (!(token && decodedToken.id)) {
    return response.status(401).json({ error: "token missing or invalid" });
  }

  const id = request.params.id;
  const watchlist = await Watchlist.findById(id);

  if (watchlist.user.toString() === decodedToken.id.toString()) {
    await Watchlist.deleteOne({ _id: id });
    response.sendStatus(204);
  } else {
    response.status(401).json({ error: "unauthorized operation" });
  }
});

// ADD ONE security TO A watchlist
watchlistsRouter.post("/:id/securities", async (request, response) => {
  console.log(request.body);
  const { security } = request.body;
  const watchlist = await Watchlist.findById(request.params.id);

  watchlist.securities = watchlist.securities.concat(security);

  const updatedWatchlist = await watchlist.save();

  updatedWatchlist
    ? response.status(200).json(updatedWatchlist.toJSON())
    : response.status(404).end();
});
// REMOVE ONE security FROM A watchlist
watchlistsRouter.delete(
  "/:watchlistId/securities/:securityId",
  async (request, response) => {
    const token = request.token;
    const decodedToken = jwt.verify(token, config.SECRET);
    if (!(token && decodedToken.id)) {
      return response.status(401).json({ error: "token missing or invalid" });
    }

    const watchlistId = request.params.watchlistId;
    const securityId = request.params.securityId;
    console.log(watchlistId, securityId);
    const watchlist = await Watchlist.findById(watchlistId);

    if (!watchlist) {
      return response.status(404).json({ error: "watchlist not found" });
    }

    // Check if the user is authorized to modify the watchlist
    if (watchlist.user.toString() !== decodedToken.id.toString()) {
      return response.status(401).json({ error: "unauthorized operation" });
    }

    // Remove the security from the watchlist
    watchlist.securities = watchlist.securities.filter(
      (security) => security.symbol !== securityId
    );
    // Save the updated watchlist
    const updatedWatchlist = await watchlist.save();

    // Respond with the updated watchlist
    response.status(200).json(updatedWatchlist.toJSON());
  }
);

module.exports = watchlistsRouter;
