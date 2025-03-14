// pages/api/banner.js
let banner = "/assets/banner1.png"; // Default banner, in-memory for now
const ADMIN_ADDRESSES = [
  "0x50864E907632D310D19280bD972ceC1d5b2fbBf3",
  "0x82C002854d3de56b2089d0FD6346fFEF33e10c95",
];

export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ banner });
  } else if (req.method === "POST") {
    const { address, bannerUrl } = req.body;
    if (!ADMIN_ADDRESSES.includes(address)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!bannerUrl) {
      return res.status(400).json({ error: "Missing banner URL" });
    }
    banner = bannerUrl;
    res.status(200).json({ banner });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}