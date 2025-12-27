// src/lib/blockchain/config.ts
// ThirdWeb configuration - DISABLED BY DEFAULT
// Uncomment and configure when ready to add blockchain features

/*
import { createThirdwebClient } from "thirdweb";

export const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});

export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111"); // Sepolia testnet
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
*/

export const BLOCKCHAIN_ENABLED = false;

export default {
  BLOCKCHAIN_ENABLED,
};
