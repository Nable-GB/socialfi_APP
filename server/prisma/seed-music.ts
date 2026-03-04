import { PrismaClient, UserRole, AuthProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const p = prisma as any;

async function main() {
  console.log("🎵 Seeding Music Mock Data...\n");

  const password = await bcrypt.hash("Password123!", 12);

  // ── Artist Users ──────────────────────────────────────────────────────────
  console.log("  Creating Artist Users...");

  const artist1 = await prisma.user.upsert({
    where: { email: "luna@musicfi.io" },
    update: {},
    create: {
      email: "luna@musicfi.io", passwordHash: password, username: "luna_beats",
      displayName: "Luna Beats", role: UserRole.USER, authProvider: AuthProvider.EMAIL,
      referralCode: "LUNA001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=luna&backgroundColor=b6e3f4",
      bio: "🌙 AI Music Producer | Lo-fi & Ambient | 100k+ streams",
      isVerified: true, offChainBalance: 500, totalEarned: 2400,
    },
  });

  const artist2 = await prisma.user.upsert({
    where: { email: "kaifire@musicfi.io" },
    update: {},
    create: {
      email: "kaifire@musicfi.io", passwordHash: password, username: "kai_fire",
      displayName: "Kai Fire", role: UserRole.USER, authProvider: AuthProvider.EMAIL,
      referralCode: "KAI0001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=kai&backgroundColor=ffd5dc",
      bio: "🔥 Hip-Hop & Trap | AI-powered bangers | Bangkok based",
      isVerified: true, offChainBalance: 320, totalEarned: 1800,
    },
  });

  const artist3 = await prisma.user.upsert({
    where: { email: "novasynth@musicfi.io" },
    update: {},
    create: {
      email: "novasynth@musicfi.io", passwordHash: password, username: "nova_synth",
      displayName: "Nova Synth", role: UserRole.USER, authProvider: AuthProvider.EMAIL,
      referralCode: "NOVA001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=nova&backgroundColor=c0aede",
      bio: "⚡ EDM & Electronic | Future Bass | Suno x Udio producer",
      isVerified: true, offChainBalance: 250, totalEarned: 1200,
    },
  });

  const artist4 = await prisma.user.upsert({
    where: { email: "sakura@musicfi.io" },
    update: {},
    create: {
      email: "sakura@musicfi.io", passwordHash: password, username: "sakura_melody",
      displayName: "Sakura Melody", role: UserRole.USER, authProvider: AuthProvider.EMAIL,
      referralCode: "SAKU001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=sakura&backgroundColor=ffdfbf",
      bio: "🌸 Pop & R&B vocalist | AI harmony | Tokyo → Worldwide",
      isVerified: false, offChainBalance: 180, totalEarned: 650,
    },
  });

  const artist5 = await prisma.user.upsert({
    where: { email: "atlas@musicfi.io" },
    update: {},
    create: {
      email: "atlas@musicfi.io", passwordHash: password, username: "atlas_sound",
      displayName: "Atlas Sound", role: UserRole.USER, authProvider: AuthProvider.EMAIL,
      referralCode: "ATLS001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=atlas&backgroundColor=d1d4f9",
      bio: "🌍 World Music & Jazz fusion | AI experiments | Berlin",
      isVerified: true, offChainBalance: 400, totalEarned: 900,
    },
  });

  console.log("  ✅ Artists:", artist1.displayName, artist2.displayName, artist3.displayName, artist4.displayName, artist5.displayName);

  // ── Check for existing tracks to avoid duplicates ─────────────────────────
  const existingCount = await p.track.count();
  if (existingCount > 0) {
    console.log(`\n  ⚠️  ${existingCount} tracks already exist. Skipping track creation.`);
    console.log("  To re-seed: delete existing tracks first or reset the database.\n");
    return;
  }

  // ── Mock Tracks ───────────────────────────────────────────────────────────
  console.log("  Creating 20 Mock Songs...");

  const audio = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  ];
  const cover = (n: number) => `https://picsum.photos/seed/song${n}/400/400`;

  const songs = [
    // Luna Beats — Lo-fi & Ambient (4 tracks)
    { title: "Midnight Rain",       artist: artist1.id, genre: "LOFI",     tags: ["lofi","chill","night"],         moodTags: ["relaxing","dreamy","peaceful"],       bpm: 75,  key: "Am",  dur: 198, plays: 12840, likes: 892,  cmt: 34, shares: 156, boosts: 18, reposts: 42, score: 87.3, model: "Suno v4",   prompt: "lo-fi beats, rain sounds, midnight city vibes" },
    { title: "Neon Dreams",         artist: artist1.id, genre: "AMBIENT",  tags: ["ambient","synthwave","neon"],   moodTags: ["dreamy","atmospheric","futuristic"],  bpm: 90,  key: "C#m", dur: 245, plays: 8420,  likes: 623,  cmt: 21, shares: 88,  boosts: 12, reposts: 31, score: 72.1, model: "Suno v4",   prompt: "ambient synthwave, neon-lit streets, cyberpunk mood" },
    { title: "Paper Clouds",        artist: artist1.id, genre: "LOFI",     tags: ["lofi","study","calm"],          moodTags: ["calm","focused","gentle"],            bpm: 68,  key: "F",   dur: 176, plays: 15200, likes: 1102, cmt: 45, shares: 210, boosts: 24, reposts: 58, score: 91.5, model: "Udio",      prompt: "gentle lo-fi piano, soft rain, study session" },
    { title: "Starfall",            artist: artist1.id, genre: "AMBIENT",  tags: ["ambient","space","ethereal"],   moodTags: ["ethereal","cosmic","serene"],         bpm: 60,  key: "Eb",  dur: 302, plays: 5600,  likes: 410,  cmt: 12, shares: 67,  boosts: 8,  reposts: 19, score: 55.2, model: "MusicGen",  prompt: "cosmic ambient, floating in space, stars falling" },

    // Kai Fire — Hip-Hop & Trap (4 tracks)
    { title: "Bangkok Drip",        artist: artist2.id, genre: "HIPHOP",   tags: ["trap","bangkok","flex"],        moodTags: ["energetic","confident","bold"],       bpm: 140, key: "Gm",  dur: 187, plays: 22100, likes: 1890, cmt: 78, shares: 345, boosts: 32, reposts: 89, score: 95.8, model: "Suno v4",   prompt: "hard trap beat, Thai rap vibes, 808 bass heavy" },
    { title: "Stack Mode",          artist: artist2.id, genre: "HIPHOP",   tags: ["hiphop","money","hustle"],      moodTags: ["aggressive","motivated","powerful"],  bpm: 130, key: "Dm",  dur: 210, plays: 18500, likes: 1456, cmt: 56, shares: 278, boosts: 28, reposts: 72, score: 89.4, model: "Suno v4",   prompt: "dark hip-hop, money motivation, deep bass" },
    { title: "Ghost Lane",          artist: artist2.id, genre: "HIPHOP",   tags: ["drill","dark","underground"],   moodTags: ["dark","intense","mysterious"],        bpm: 145, key: "Bbm", dur: 195, plays: 9870,  likes: 780,  cmt: 32, shares: 134, boosts: 15, reposts: 38, score: 68.9, model: "Udio",      prompt: "UK drill meets Thai rap, eerie melody, punchy drums" },
    { title: "Crypto Kings",        artist: artist2.id, genre: "HIPHOP",   tags: ["crypto","web3","anthem"],       moodTags: ["hype","celebration","futuristic"],    bpm: 128, key: "Em",  dur: 224, plays: 31200, likes: 2340, cmt: 98, shares: 520, boosts: 45, reposts: 112,score: 98.2, model: "Suno v4",   prompt: "crypto anthem, victory vibes, orchestral trap" },

    // Nova Synth — EDM & Electronic (4 tracks)
    { title: "Pulse Override",      artist: artist3.id, genre: "EDM",      tags: ["edm","bass","festival"],        moodTags: ["energetic","euphoric","electric"],    bpm: 150, key: "F#m", dur: 267, plays: 14300, likes: 1120, cmt: 41, shares: 198, boosts: 22, reposts: 51, score: 82.7, model: "Suno v4",   prompt: "festival EDM, massive drops, future bass elements" },
    { title: "Digital Sunrise",     artist: artist3.id, genre: "EDM",      tags: ["progressive","sunrise","trance"],moodTags: ["uplifting","euphoric","hopeful"],     bpm: 138, key: "Ab",  dur: 312, plays: 11200, likes: 890,  cmt: 29, shares: 145, boosts: 19, reposts: 43, score: 76.4, model: "Udio",      prompt: "progressive house, sunrise melody, uplifting breakdown" },
    { title: "Glitch City",         artist: artist3.id, genre: "EDM",      tags: ["glitch","experimental","bass"], moodTags: ["chaotic","futuristic","intense"],     bpm: 160, key: "Cm",  dur: 198, plays: 7800,  likes: 560,  cmt: 18, shares: 89,  boosts: 10, reposts: 24, score: 58.3, model: "MusicGen",  prompt: "glitch hop, broken beats, digital chaos" },
    { title: "Velocity",            artist: artist3.id, genre: "EDM",      tags: ["dubstep","heavy","drop"],       moodTags: ["aggressive","powerful","explosive"],  bpm: 150, key: "D",   dur: 234, plays: 19800, likes: 1670, cmt: 62, shares: 310, boosts: 30, reposts: 78, score: 90.1, model: "Suno v4",   prompt: "heavy dubstep, massive wobble bass, festival destroyer" },

    // Sakura Melody — Pop & R&B (4 tracks)
    { title: "Cherry Blossom Love", artist: artist4.id, genre: "POP",      tags: ["pop","love","japanese"],        moodTags: ["romantic","sweet","nostalgic"],       bpm: 112, key: "G",   dur: 203, plays: 8900,  likes: 720,  cmt: 28, shares: 112, boosts: 14, reposts: 35, score: 69.8, model: "Suno v4",   prompt: "J-pop style love song, cherry blossom theme, sweet vocals" },
    { title: "Heartbeat",           artist: artist4.id, genre: "RNB",      tags: ["rnb","soul","vocal"],           moodTags: ["emotional","warm","intimate"],        bpm: 95,  key: "Bb",  dur: 228, plays: 6400,  likes: 510,  cmt: 19, shares: 78,  boosts: 9,  reposts: 22, score: 52.6, model: "Udio",      prompt: "smooth R&B, heartfelt vocals, piano ballad" },
    { title: "Neon Tokyo",          artist: artist4.id, genre: "POP",      tags: ["pop","city","nightlife"],       moodTags: ["vibrant","exciting","urban"],         bpm: 120, key: "A",   dur: 191, plays: 10500, likes: 830,  cmt: 33, shares: 145, boosts: 17, reposts: 40, score: 74.2, model: "Suno v4",   prompt: "J-pop meets K-pop, neon city nights, catchy hook" },
    { title: "Whisper",             artist: artist4.id, genre: "RNB",      tags: ["rnb","chill","late night"],     moodTags: ["sensual","smooth","intimate"],        bpm: 88,  key: "Db",  dur: 256, plays: 4200,  likes: 340,  cmt: 11, shares: 45,  boosts: 5,  reposts: 14, score: 41.0, model: undefined,   prompt: undefined },

    // Atlas Sound — World & Jazz (4 tracks)
    { title: "Sahara Wind",         artist: artist5.id, genre: "WORLD",    tags: ["world","desert","ethnic"],      moodTags: ["mystical","adventurous","warm"],      bpm: 100, key: "E",   dur: 278, plays: 7300,  likes: 590,  cmt: 22, shares: 98,  boosts: 11, reposts: 28, score: 60.5, model: "MusicGen",  prompt: "Saharan desert vibes, ethnic percussion, oud melody" },
    { title: "Berlin Nights",       artist: artist5.id, genre: "JAZZ",     tags: ["jazz","berlin","club"],         moodTags: ["sophisticated","cool","smoky"],       bpm: 110, key: "Fm",  dur: 315, plays: 5100,  likes: 420,  cmt: 16, shares: 67,  boosts: 7,  reposts: 18, score: 48.9, model: "Suno v4",   prompt: "modern jazz, Berlin club atmosphere, saxophone solo" },
    { title: "Monsoon",             artist: artist5.id, genre: "WORLD",    tags: ["world","rain","indian"],        moodTags: ["meditative","flowing","peaceful"],    bpm: 85,  key: "C",   dur: 290, plays: 9600,  likes: 780,  cmt: 30, shares: 132, boosts: 16, reposts: 39, score: 71.3, model: "Udio",      prompt: "Indian classical fusion, monsoon rain, sitar and tabla" },
    { title: "Atlas Rising",        artist: artist5.id, genre: "EXPERIMENTAL", tags: ["experimental","fusion","cinematic"], moodTags: ["epic","cinematic","grand"], bpm: 105, key: "Gm",  dur: 340, plays: 3800,  likes: 310,  cmt: 14, shares: 52,  boosts: 6,  reposts: 15, score: 38.7, model: "MusicGen",  prompt: "cinematic world fusion, orchestral meets electronic, epic journey" },
  ];

  const createdTracks: any[] = [];
  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    const track = await p.track.create({
      data: {
        title: s.title,
        description: `${s.title} — produced with AI`,
        genre: s.genre,
        tags: s.tags,
        moodTags: s.moodTags,
        bpm: s.bpm,
        key: s.key,
        duration: s.dur,
        isAiGenerated: s.model !== undefined,
        aiModel: s.model || null,
        aiPrompt: s.prompt || null,
        audioUrl: audio[i % audio.length],
        coverUrl: cover(i + 1),
        playCount: s.plays,
        likeCount: s.likes,
        commentCount: s.cmt,
        shareCount: s.shares,
        boostCount: s.boosts,
        repostCount: s.reposts,
        engagementScore: s.score,
        status: "PUBLISHED",
        artistId: s.artist,
        publishedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
      },
    });
    createdTracks.push(track);
    process.stdout.write(`    🎵 ${track.title}\n`);
  }

  console.log(`\n  ✅ ${createdTracks.length} songs created!`);

  // ── Music NFTs ────────────────────────────────────────────────────────────
  console.log("  Creating Music NFTs...");

  const nftDefs = [
    { idx: 4,  name: "Bangkok Drip — Collector's Edition", supply: 100, price: 10, royalty: 12 },
    { idx: 7,  name: "Crypto Kings — Diamond NFT",         supply: 50,  price: 25, royalty: 15 },
    { idx: 2,  name: "Paper Clouds — Zen Collection",      supply: 200, price: 3,  royalty: 8 },
    { idx: 8,  name: "Pulse Override — Festival Pass",     supply: 150, price: 5,  royalty: 10 },
    { idx: 11, name: "Velocity — Limited Drop",            supply: 75,  price: 15, royalty: 12 },
    { idx: 14, name: "Neon Tokyo — City Edition",          supply: 120, price: 4,  royalty: 8 },
    { idx: 18, name: "Monsoon — Meditation Series",        supply: 300, price: 2,  royalty: 6 },
    { idx: 0,  name: "Midnight Rain — Dreamer's Pass",     supply: 80,  price: 8,  royalty: 10 },
  ];

  for (const n of nftDefs) {
    const track = createdTracks[n.idx];
    const sold = Math.floor(n.supply * (0.15 + Math.random() * 0.5));
    await p.musicNFT.create({
      data: {
        trackId: track.id, artistId: track.artistId,
        name: n.name,
        description: `Own a fraction of "${track.title}" and earn streaming royalties.`,
        coverUrl: track.coverUrl,
        totalSupply: n.supply, availableSupply: n.supply - sold,
        pricePerFraction: n.price, royaltyPercent: n.royalty,
        totalStreamingRevenue: track.playCount * 0.004,
        isMinted: true, isListed: true,
      },
    });
    console.log(`    🖼️  ${n.name} (${sold}/${n.supply} sold)`);
  }

  console.log(`  ✅ ${nftDefs.length} Music NFTs created`);

  // ── Boosts ────────────────────────────────────────────────────────────────
  console.log("  Creating Boosts...");

  const allUsers = [artist1, artist2, artist3, artist4, artist5];
  // Also fetch alice & bob if they exist
  const alice = await prisma.user.findUnique({ where: { email: "alice@example.com" } });
  const bob = await prisma.user.findUnique({ where: { email: "bob@example.com" } });
  if (alice) allUsers.push(alice);
  if (bob) allUsers.push(bob);

  let boostN = 0;
  for (let i = 0; i < 20; i++) {
    const track = createdTracks[Math.floor(Math.random() * createdTracks.length)];
    const user = allUsers[Math.floor(Math.random() * allUsers.length)];
    const tiers = ["BASIC","BASIC","BASIC","PREMIUM","PREMIUM","SUPER"] as const;
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const cost = { BASIC: 1, PREMIUM: 5, SUPER: 20 }[tier];
    try {
      await p.musicBoost.create({ data: { trackId: track.id, boosterId: user.id, tier, tokensCost: cost, isActive: true, expiresAt: new Date(Date.now() + 86400000) } });
      boostN++;
    } catch { /* skip */ }
  }
  console.log(`  ✅ ${boostN} Boosts created`);

  // ── Reposts ───────────────────────────────────────────────────────────────
  console.log("  Creating Reposts...");

  const messages = ["🔥 This slaps!", "Must listen!", "Incredible vibes ✨", "On repeat 🎧", "Best AI track ever!", "Can't stop playing this", "Shared to all my friends 💯"];
  let repostN = 0;
  for (let i = 0; i < 25; i++) {
    const track = createdTracks[Math.floor(Math.random() * createdTracks.length)];
    const user = allUsers[Math.floor(Math.random() * allUsers.length)];
    if (track.artistId === user.id) continue;
    try {
      await p.trackRepost.create({ data: { trackId: track.id, userId: user.id, message: messages[Math.floor(Math.random() * messages.length)], rewardEarned: +(0.3 + Math.random() * 0.7).toFixed(2) } });
      repostN++;
    } catch { /* skip dupes */ }
  }
  console.log(`  ✅ ${repostN} Reposts created`);

  // ── Engagement Scores ─────────────────────────────────────────────────────
  console.log("  Creating Engagement Scores...");
  for (const u of allUsers) {
    try {
      await p.engagementScore.upsert({
        where: { userId: u.id },
        update: {},
        create: { userId: u.id, score: 40 + Math.floor(Math.random() * 55), totalActions: 10 + Math.floor(Math.random() * 90), validActions: 8 + Math.floor(Math.random() * 70), spamActions: Math.floor(Math.random() * 3), isFlagged: false },
      });
    } catch { /* skip */ }
  }
  console.log("  ✅ Engagement Scores created");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Music seed complete!");
  console.log(`   🎵 ${createdTracks.length} songs | 🖼️ ${nftDefs.length} NFTs | ⚡ ${boostN} boosts | 🔁 ${repostN} reposts`);
  console.log("\n   Artists (password: Password123!):");
  console.log("   • luna@musicfi.io      — Lo-fi & Ambient");
  console.log("   • kaifire@musicfi.io   — Hip-Hop & Trap");
  console.log("   • novasynth@musicfi.io — EDM & Electronic");
  console.log("   • sakura@musicfi.io    — Pop & R&B");
  console.log("   • atlas@musicfi.io     — World & Jazz");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
