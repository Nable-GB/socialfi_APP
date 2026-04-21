import prisma from "../src/lib/prisma.js";

async function main() {
  const [users, subscriptions, creatorCodes] = await Promise.all([
    prisma.user.count({ where: { subscriptionTier: "CREATOR" as any } }),
    prisma.subscription.count({ where: { tier: "CREATOR" as any } }),
    prisma.creatorCode.count({ where: { tier: "CREATOR" as any } }),
  ]);

  const summary = { users, subscriptions, creatorCodes };
  console.log("Tier migration verification:", summary);

  if (users > 0 || subscriptions > 0 || creatorCodes > 0) {
    process.exitCode = 1;
    return;
  }
}

main()
  .catch((error) => {
    console.error("Failed to verify tier migration:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
