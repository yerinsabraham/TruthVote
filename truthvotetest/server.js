// server.js
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

let votes = {};
let banner = "/assets/banner1.png"; // Default banner

app.get("/votes", (req, res) => {
  res.json(votes);
});

app.post("/vote", (req, res) => {
  const { marketId, address, option } = req.body;
  if (!marketId || !address || !option) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  votes[marketId] = votes[marketId] || {};
  votes[marketId][address] = option;
  res.json(votes);
});

app.get("/banner", (req, res) => {
  res.json({ banner });
});

app.post("/banner", (req, res) => {
  const { address, bannerUrl } = req.body;
  const adminAddress = "0x50864E907632D310D19280bD972ceC1d5b2fbBf3";
  if (address !== adminAddress) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  if (!bannerUrl) {
    return res.status(400).json({ error: "Missing banner URL" });
  }
  banner = bannerUrl;
  res.json({ banner });
});

app.listen(3001, () => {
  console.log("Vote server running on http://localhost:3001");
});