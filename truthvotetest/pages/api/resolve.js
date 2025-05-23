// ~/truthvotemainn/truthvotetest/pages/api/resolve.js
import { Pool } from "pg";
import { ThirdwebSDK } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { contract } from "@/constants/contracts";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ADMIN_ADDRESSES = [
  "0x50864E907632D310D19280bD972ceC1d5b2fbBf3",
  "0x82C002854d3de56b2089d0FD6346fFEF33e10c95",
  "0x0CAfc81A92d4c7a6ebeef6ECB3B1596b1e65db08",
];

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { marketId, outcome, address } = req.body;
    if (!marketId || outcome === undefined || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!ADMIN_ADDRESSES.includes(address)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      // Map boolean to MarketOutcome (true = OPTION_A, false = OPTION_B)
      const contractOutcome = outcome ? 1 : 2; // OPTION_A=1, OPTION_B=2

      // Update Postgres
      await pool.query(
        "INSERT INTO market_outcomes (market_id, outcome) VALUES ($1, $2) ON CONFLICT (market_id) DO UPDATE SET outcome = $2",
        [marketId, outcome]
      );

      // Call smart contract
      const sdk = new ThirdwebSDK(sepolia, {
        clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
      });
      const contractInstance = await sdk.getContract(contract.address);
      await contractInstance.call("resolveMarket", [BigInt(marketId), contractOutcome]);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error resolving market:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else if (req.method === "GET") {
    const { marketId } = req.query;
    if (!marketId) {
      return res.status(400).json({ error: "Missing marketId" });
    }
    try {
      const { rows } = await pool.query(
        "SELECT outcome FROM market_outcomes WHERE market_id = $1",
        [marketId]
      );
      res.status(200).json({ outcome: rows[0]?.outcome });
    } catch (error) {
      console.error("Error fetching outcome:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}