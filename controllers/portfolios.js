const config = require("../utils/config");
const portfoliosRouter = require("express").Router();
const Portfolio = require("../models/portfolio");
const User = require("../models/user");
const middleware = require("../utils/middleware");
const jwt = require("jsonwebtoken");

portfoliosRouter.get("/", async (request, response) => {
  const portfolios = await Portfolio.find({}).populate("user", {
    username: 1,
    name: 1,
  });

  response.json(portfolios);
});

portfoliosRouter.get("/:id", async (request, response) => {
  const portfolio = await Portfolio.findById(request.params.id);
  if (portfolio) {
    response.json(portfolio);
  } else {
    response.status(404).end();
  }
});

portfoliosRouter.post("/", async (request, response) => {
  const body = request.body;
  const user = request.user;
  const token = request.token;
  //console.log(body.title, body.author, user);
  const decodedToken = jwt.verify(token, config.SECRET);
  if (!(token && decodedToken.id)) {
    return response.status(401).json({ error: "token missing or invalid" });
  }

  const portfolio = new Portfolio({
    title: body.title,
    author: body.author,
    user: user._id,
  });

  const savedPortfolio = await portfolio.save();
  user.portfolios = user.portfolios.concat(savedPortfolio._id);
  await user.save();
  response.status(201).json(savedPortfolio.toJSON());
});

portfoliosRouter.delete("/:id", async (request, response) => {
  const token = request.token;
  const decodedToken = jwt.verify(token, config.SECRET);
  if (!(token && decodedToken.id)) {
    return response.status(401).json({ error: "token missing or invalid" });
  }

  const id = request.params.id;
  const portfolio = await Portfolio.findById(id);

  if (portfolio.user.toString() === decodedToken.id.toString()) {
    await Portfolio.deleteOne({ _id: id });
    response.sendStatus(204);
  } else {
    response.status(401).json({ error: "unauthorized operation" });
  }
});

// ADD ONE security TO A PORTFOLIO
portfoliosRouter.post("/:id/securities", async (request, response) => {
  console.log(request.body);
  const { security } = request.body;
  const portfolio = await Portfolio.findById(request.params.id);

  portfolio.securities = portfolio.securities.concat(security);

  const updatedPortfolio = await portfolio.save();

  updatedPortfolio
    ? response.status(200).json(updatedPortfolio.toJSON())
    : response.status(404).end();
});

//CHANGE NAME OF PORTFOLIO & OR CHANGE securities IN PORT
portfoliosRouter.put("/:id", async (request, response) => {
  const body = request.body;

  try {
    const portfolio = await Portfolio.findById(request.params.id);

    if (!portfolio) {
      return response.status(404).json({ error: "Portfolio not found" });
    }

    // Update title if provided
    if (body.title) {
      portfolio.title = body.title;
    }

    // Update securities if provided
    if (body.securities) {
      portfolio.securities = body.securities;
    }

    // Check and add portfolioValue field if not present
    if (!portfolio.portfolioValue) {
      portfolio.portfolioValue = [];
    }

    // Update portfolioValue if provided
    if (body.date && body.value) {
      // Check if the date already exists, if it does, update the value
      const existingEntryIndex = portfolio.portfolioValue.findIndex(
        (entry) => entry.date === body.date
      );

      if (existingEntryIndex !== -1) {
        // If the date exists, update the value
        portfolio.portfolioValue[existingEntryIndex].value = body.value;
      } else {
        // If the date doesn't exist, add a new entry
        portfolio.portfolioValue.push({ date: body.date, value: body.value });
      }
    }

    // Save the updated portfolio
    const updatedPortfolio = await portfolio.save();

    response.status(200).json(updatedPortfolio.toJSON());
  } catch (error) {
    console.error("Error updating portfolio:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

module.exports = portfoliosRouter;
