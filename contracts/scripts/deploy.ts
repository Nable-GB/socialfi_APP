import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SocialFiTreasury with account:", deployer.address);

  // ── Configuration ─────────────────────────────────────────────────────
  // Replace these with your actual token addresses on the target network.
  const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS ?? "0x0000000000000000000000000000000000000001";
  const REWARD_TOKEN_ADDRESS = process.env.REWARD_TOKEN_ADDRESS ?? "0x0000000000000000000000000000000000000002";
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS ?? deployer.address;
  const DISTRIBUTOR_ADDRESS = process.env.DISTRIBUTOR_ADDRESS ?? deployer.address;
  const MAX_BATCH_SIZE = 200;

  // ── Deploy ────────────────────────────────────────────────────────────
  const Treasury = await ethers.getContractFactory("SocialFiTreasury");
  const treasury = await Treasury.deploy(
    USDT_ADDRESS,
    REWARD_TOKEN_ADDRESS,
    ADMIN_ADDRESS,
    DISTRIBUTOR_ADDRESS,
    MAX_BATCH_SIZE
  );

  await treasury.waitForDeployment();
  const address = await treasury.getAddress();

  console.log("SocialFiTreasury deployed to:", address);
  console.log("  USDT Token:     ", USDT_ADDRESS);
  console.log("  Reward Token:   ", REWARD_TOKEN_ADDRESS);
  console.log("  Admin:          ", ADMIN_ADDRESS);
  console.log("  Distributor:    ", DISTRIBUTOR_ADDRESS);
  console.log("  Max Batch Size: ", MAX_BATCH_SIZE);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
