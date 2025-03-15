// ~/truthvotemainn/truthvotetest/pages/api/banner.js
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ADMIN_ADDRESSES = [
  "0x50864E907632D310D19280bD972ceC1d5b2fbBf3",
  "0x82C002854d3de56b2089d0FD6346fFEF33e10c95",
  "0x0CAfc81A92d4c7a6ebeef6ECB3B1596b1e65db08",
];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store"); // Disable caching
  if (req.method === "GET") {
    try {
      const { rows } = await pool.query("SELECT url FROM banners ORDER BY updated_at DESC LIMIT 1");
      const banner = rows[0]?.url || "/assets/banner1.png";
      res.status(200).json({ banner });
    } catch (error) {
      console.error("Error fetching banner:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else if (req.method === "POST") {
    const { address, bannerUrl } = req.body;
    if (!ADMIN_ADDRESSES.includes(address)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!bannerUrl) {
      return res.status(400).json({ error: "Missing banner URL" });
    }
    try {
      await pool.query("INSERT INTO banners (url) VALUES ($1)", [bannerUrl]);
      res.status(200).json({ banner: bannerUrl });
    } catch (error) {
      console.error("Error saving banner:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}