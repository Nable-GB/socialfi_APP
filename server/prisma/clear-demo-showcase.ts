import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const p = prisma as any;

const DEMO_EMAILS = [
  "luna@musicfi.io",
  "kaifire@musicfi.io",
  "novasynth@musicfi.io",
  "sakura@musicfi.io",
  "atlas@musicfi.io",
  "vela@musicfi.io",
  "orion@musicfi.io",
  "mira@musicfi.io",
];

async function main() {
  const artists = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: { id: true, username: true },
  });

  if (artists.length === 0) {
    console.log("No demo showcase artists found. Nothing to clear.");
    return;
  }

  const artistIds = artists.map((artist) => artist.id);
  const tracks = await prisma.track.findMany({ where: { artistId: { in: artistIds } }, select: { id: true } });
  const trackIds = tracks.map((track) => track.id);

  console.log("Clearing demo showcase for artists:", artists.map((artist) => artist.username).join(", "));

  if (trackIds.length > 0) {
    await p.topArtistGrant.deleteMany({ where: { trackId: { in: trackIds } } });
    await p.competitionEntry.deleteMany({ where: { trackId: { in: trackIds } } });
    await p.nFTBrochure.deleteMany({ where: { trackId: { in: trackIds } } });
    await p.musicNFT.deleteMany({ where: { trackId: { in: trackIds } } });
    await prisma.releaseVote.deleteMany({ where: { trackId: { in: trackIds } } });
    await prisma.trackLike.deleteMany({ where: { trackId: { in: trackIds } } });
    await prisma.trackComment.deleteMany({ where: { trackId: { in: trackIds } } });
    await prisma.trackPlay.deleteMany({ where: { trackId: { in: trackIds } } });
    await p.musicBoost.deleteMany({ where: { trackId: { in: trackIds } } });
    await p.trackRepost.deleteMany({ where: { trackId: { in: trackIds } } });
    await p.payoutRelease.deleteMany({ where: { trackId: { in: trackIds } } });
    await prisma.track.deleteMany({ where: { id: { in: trackIds } } });
  }

  await p.monthlyCompetition.deleteMany({ where: { OR: [{ entries: { none: {} } }, { grants: { none: {} } }] } });
  await p.engagementScore.deleteMany({ where: { userId: { in: artistIds } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: artistIds } } });
  await prisma.user.deleteMany({ where: { id: { in: artistIds } } });

  console.log("✅ Demo showcase cleared.");
}

main()
  .catch((error) => {
    console.error("❌ Failed to clear demo showcase:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());