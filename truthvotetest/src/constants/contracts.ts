// src/constants/contracts.ts
import { client } from "@/app/client";
import { getContract } from "thirdweb";
import { sepolia } from "thirdweb/chains";

export const contractAddress = "0xc1B0d0A03f04Ce5b79aF4252D945ec8e5ADbd980";
export const tokenAddress = "0xD48C5Aa57Aedf48a2DEc248F8bBE8bFC4A56d642";

export const contract = getContract({
    client: client,
    chain: sepolia,
    address: contractAddress
});

export const tokenContract = getContract({
    client: client,
    chain: sepolia,
    address: tokenAddress
});