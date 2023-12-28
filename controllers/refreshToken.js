const jwt = require("jsonwebtoken");
const express = require("express");
const refreshTokenRouter = express.Router();

refreshTokenRouter.post("/", async (request, response) => {
  const { token } = request.body;

  try {
    // Verify the current token
    const decodedToken = jwt.verify(token, process.env.SECRET);

    // Create a new token with a renewed expiration time
    const userForToken = {
      username: decodedToken.username,
      id: decodedToken.id,
    };

    const newToken = jwt.sign(userForToken, process.env.SECRET, {
      expiresIn: 60 * 60, // Renewed expiration time, e.g., 60 minutes
    });

    response.status(200).send({ token: newToken });
  } catch (error) {
    response.status(401).json({ error: "Invalid token" });
  }
});

module.exports = refreshTokenRouter;
