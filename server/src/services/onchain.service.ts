import { ethers } from "ethers";
import { env } from "../config/env.js";

// Minimal ERC-20 ABI — only the transfer function we need
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
];

export interface TransferResult {
  txHash: string;
  blockNumber: number;
  explorerUrl: string;
}

function getExplorerUrl(txHash: string): string {
  // Sepolia testnet
  if (env.CHAIN_ID === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
  // Polygon mainnet
  if (env.CHAIN_ID === 137) return `https://polygonscan.com/tx/${txHash}`;
  // Polygon Mumbai testnet
  if (env.CHAIN_ID === 80001) return `https://mumbai.polygonscan.com/tx/${txHash}`;
  return `https://etherscan.io/tx/${txHash}`;
}

/**
 * Check if the on-chain transfer is configured (all required env vars present).
 */
export function isOnChainEnabled(): boolean {
  return !!(env.RPC_URL && env.TOKEN_CONTRACT_ADDRESS && env.OPERATOR_PRIVATE_KEY);
}

/**
 * Send ERC-20 tokens from the operator wallet to a recipient.
 * @param toAddress  Recipient Ethereum address
 * @param amount     Human-readable token amount (e.g. "100.5")
 * @returns          TransferResult with txHash, blockNumber, and explorer URL
 */
export async function sendTokens(toAddress: string, amount: string): Promise<TransferResult> {
  if (!isOnChainEnabled()) {
    throw new Error("On-chain transfer not configured. Set RPC_URL, TOKEN_CONTRACT_ADDRESS, and OPERATOR_PRIVATE_KEY.");
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URL);
  const wallet = new ethers.Wallet(env.OPERATOR_PRIVATE_KEY, provider);
  const token = new ethers.Contract(env.TOKEN_CONTRACT_ADDRESS, ERC20_ABI, wallet);

  // Get decimals dynamically
  const decimals: number = await token.decimals();
  const amountWei = ethers.parseUnits(amount, decimals);

  // Check operator balance
  const operatorBalance: bigint = await token.balanceOf(wallet.address);
  if (operatorBalance < amountWei) {
    throw new Error("Operator wallet has insufficient token balance");
  }

  const tx = await token.transfer(toAddress, amountWei);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: getExplorerUrl(receipt.hash),
  };
}

/**
 * Get the operator wallet's token balance (for monitoring).
 */
export async function getOperatorBalance(): Promise<{ balance: string; symbol: string }> {
  if (!isOnChainEnabled()) return { balance: "0", symbol: "SFT" };

  const provider = new ethers.JsonRpcProvider(env.RPC_URL);
  const wallet = new ethers.Wallet(env.OPERATOR_PRIVATE_KEY, provider);
  const token = new ethers.Contract(env.TOKEN_CONTRACT_ADDRESS, ERC20_ABI, provider);

  const [balance, decimals, symbol]: [bigint, number, string] = await Promise.all([
    token.balanceOf(wallet.address),
    token.decimals(),
    token.symbol(),
  ]);

  return {
    balance: ethers.formatUnits(balance, decimals),
    symbol,
  };
}
