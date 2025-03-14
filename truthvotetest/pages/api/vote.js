// ~/truthvotemainn/truthvotetest/pages/api/vote.js
const votes = {}; // In-memory store, temporary

export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(votes);
  } else if (req.method === "POST") {
    const { marketId, address, option } = req.body;
    if (!marketId || !address || !option) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    votes[marketId] = votes[marketId] || {};
    votes[marketId][address] = option;
    res.status(200).json(votes);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}