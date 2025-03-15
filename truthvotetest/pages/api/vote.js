// ~/truthvotemainn/truthvotetest/pages/api/vote.js
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store"); // Disable caching
  if (req.method === "GET") {
    try {
      const { rows } = await pool.query("SELECT * FROM votes");
      const votes = {};
      rows.forEach(row => {
        votes[row.market_id] = votes[row.market_id] || {};
        votes[row.market_id][row.address] = row.option;
      });
      res.status(200).json(votes);
    } catch (error) {
      console.error("Error fetching votes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else if (req.method === "POST") {
    const { marketId, address, option } = req.body;
    if (!marketId || !address || !option) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    try {
      await pool.query(
        "INSERT INTO votes (market_id, address, option) VALUES ($1, $2, $3) ON CONFLICT (market_id, address) DO UPDATE SET option = $3",
        [marketId, address, option]
      );
      const { rows } = await pool.query("SELECT * FROM votes");
      const votes = {};
      rows.forEach(row => {
        votes[row.market_id] = votes[row.market_id] || {};
        votes[row.market_id][row.address] = row.option;
      });
      res.status(200).json(votes);
    } catch (error) {
      console.error("Error saving vote:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}