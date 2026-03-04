import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const p = prisma as any;

async function main() {
  const seedEmails = [
    "luna@musicfi.io",
    "kaifire@musicfi.io",
    "novasynth@musicfi.io",
    "sakura@musicfi.io",
    "atlas@musicfi.io",
  ];

  const artists = await prisma.user.findMany({
    where: { email: { in: seedEmails } },
    select: { id: true, username: true },
  });

  console.log("Found demo artists:", artists.map((a) => a.username));

  if (artists.length === 0) {
    console.log("No demo artists found. Nothing to delete.");
    return;
  }

  const ids = artists.map((a) => a.id);

  // Delete in order to respect FK constraints
  const boosts = await p.musicBoost.deleteMany({ where: { track: { artistId: { in: ids } } } });
  console.log("Deleted boosts:", boosts.count);

  const reposts = await p.trackRepost.deleteMany({ where: { track: { artistId: { in: ids } } } });
  console.log("Deleted reposts:", reposts.count);

  const nfts = await p.musicNFT.deleteMany({ where: { artistId: { in: ids } } });
  console.log("Deleted Music NFTs:", nfts.count);

  const tracks = await p.track.deleteMany({ where: { artistId: { in: ids } } });
  console.log("Deleted tracks:", tracks.count);

  const scores = await p.engagementScore.deleteMany({ where: { userId: { in: ids } } });
  console.log("Deleted engagement scores:", scores.count);

  console.log("\n✅ Demo music data cleared successfully.");
}

main()
  .catch((e) => { console.error("Failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
