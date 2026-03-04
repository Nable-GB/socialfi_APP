import { PrismaClient, UserRole, AuthProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Ad Packages ───────────────────────────────────────────────────────
  console.log("  Creating Ad Packages...");
  const starter = await prisma.adPackage.upsert({
    where: { id: "pkg-starter" },
    update: {},
    create: {
      id: "pkg-starter",
      name: "Starter",
      description: "Perfect for small businesses testing the platform.",
      priceFiat: 49.0,
      priceCrypto: 49.0,
      impressions: 5000,
      durationDays: 7,
      maxPosts: 1,
      totalRewardPool: 500,
      sortOrder: 1,
    },
  });

  const growth = await prisma.adPackage.upsert({
    where: { id: "pkg-growth" },
    update: {},
    create: {
      id: "pkg-growth",
      name: "Growth",
      description: "Best value for growing brands.",
      priceFiat: 149.0,
      priceCrypto: 149.0,
      impressions: 20000,
      durationDays: 14,
      maxPosts: 3,
      totalRewardPool: 2000,
      sortOrder: 2,
    },
  });

  const enterprise = await prisma.adPackage.upsert({
    where: { id: "pkg-enterprise" },
    update: {},
    create: {
      id: "pkg-enterprise",
      name: "Enterprise",
      description: "Maximum reach for serious advertisers.",
      priceFiat: 499.0,
      priceCrypto: 499.0,
      impressions: 100000,
      durationDays: 30,
      maxPosts: 10,
      totalRewardPool: 10000,
      sortOrder: 3,
    },
  });

  console.log("  ✅ Ad Packages created:", starter.name, growth.name, enterprise.name);

  // ── 2. Users ─────────────────────────────────────────────────────────────
  console.log("  Creating Users...");
  const password = await bcrypt.hash("Password123!", 12);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@socialfi.app" },
    update: {},
    create: {
      email: "admin@socialfi.app",
      passwordHash: password,
      username: "admin",
      displayName: "SocialFi Admin",
      role: UserRole.ADMIN,
      authProvider: AuthProvider.EMAIL,
      referralCode: "ADMIN001",
      isVerified: true,
    },
  });

  // Regular user (Alice)
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      passwordHash: password,
      username: "alice_web3",
      displayName: "Alice",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "ALICE001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice",
      bio: "Web3 enthusiast | NFT collector 🎨",
    },
  });

  // Regular user (Bob) — referred by Alice
  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      passwordHash: password,
      username: "bob_crypto",
      displayName: "Bob",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "BOB0001",
      referredById: alice.id,
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob",
      bio: "DeFi degen 🚀",
    },
  });

  // Merchant user
  const merchant = await prisma.user.upsert({
    where: { email: "merchant@nftstore.io" },
    update: {},
    create: {
      email: "merchant@nftstore.io",
      passwordHash: password,
      username: "nft_store",
      displayName: "NFT Store Official",
      role: UserRole.MERCHANT,
      authProvider: AuthProvider.EMAIL,
      referralCode: "MERCH01",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=merchant",
      bio: "Premium NFT marketplace | Best collections",
      isVerified: true,
    },
  });

  console.log("  ✅ Users created:", admin.username, alice.username, bob.username, merchant.username);

  // ── 3. Follow Relationships ───────────────────────────────────────────────
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: alice.id, followingId: bob.id } },
    update: {},
    create: { followerId: alice.id, followingId: bob.id },
  });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: bob.id, followingId: alice.id } },
    update: {},
    create: { followerId: bob.id, followingId: alice.id },
  });

  console.log("  ✅ Follow relationships created");

  // ── 4. Organic Posts ──────────────────────────────────────────────────────
  console.log("  Creating Posts...");
  const post1 = await prisma.socialPost.create({
    data: {
      authorId: alice.id,
      content: "Just minted my first NFT on this platform! The community is amazing 🎉 #NFT #Web3 #SocialFi",
      type: "ORGANIC",
      likesCount: 12,
      commentsCount: 3,
    },
  });

  const post2 = await prisma.socialPost.create({
    data: {
      authorId: bob.id,
      content: "Earned my first 50 tokens just by engaging with the feed today. This Engage-to-Earn model is legit! 🪙",
      type: "ORGANIC",
      likesCount: 8,
      commentsCount: 1,
    },
  });

  const post3 = await prisma.socialPost.create({
    data: {
      authorId: alice.id,
      content: "Web3 is not just about money — it's about ownership of your data and digital identity. Who else believes this? 💪",
      type: "ORGANIC",
      likesCount: 24,
      commentsCount: 7,
      sharesCount: 3,
    },
  });

  console.log("  ✅ Organic posts created");

  // ── 5. Active Ad Campaign + Sponsored Post ────────────────────────────────
  console.log("  Creating Ad Campaign...");
  const campaign = await prisma.adCampaign.create({
    data: {
      merchantId: merchant.id,
      adPackageId: growth.id,
      title: "🔥 Exclusive NFT Drop — Limited Edition Collection",
      description: "Discover our hand-crafted NFT collection. Only 500 pieces available. Early supporters get 20% bonus rewards!",
      targetUrl: "https://nftstore.io/collection/exclusive",
      paymentMethod: "FIAT_STRIPE",
      paymentStatus: "COMPLETED",
      amountPaid: 149.0,
      stripePaymentId: "pi_test_seed_001",
      stripeSessionId: "cs_test_seed_001",
      impressionsTotal: 20000,
      impressionsDelivered: 1240,
      rewardPoolTotal: 2000,
      rewardPoolDistributed: 124,
      status: "ACTIVE",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // Sponsored post tied to the campaign
  await prisma.socialPost.create({
    data: {
      authorId: merchant.id,
      content: "🔥 SPONSORED | Exclusive NFT Drop — Limited Edition Collection!\n\nDiscover our hand-crafted NFT collection. Only 500 pieces available.\n\n✅ Early supporters get 20% bonus rewards!\n👉 Tap to learn more and earn tokens for watching.",
      type: "SPONSORED",
      adCampaignId: campaign.id,
      rewardPerView: 0.05,
      rewardPerEngagement: 0.1,
      viewsCount: 1240,
      likesCount: 89,
    },
  });

  console.log("  ✅ Ad Campaign + Sponsored Post created");

  // ── 6. Sample Reward Transactions ─────────────────────────────────────────
  console.log("  Creating Reward Transactions...");
  await prisma.rewardTransaction.create({
    data: {
      userId: alice.id,
      type: "SIGNUP_BONUS",
      amount: 10.0,
      description: "Welcome bonus for joining SocialFi",
      status: "DISTRIBUTED",
    },
  });

  await prisma.rewardTransaction.create({
    data: {
      userId: bob.id,
      type: "SIGNUP_BONUS",
      amount: 10.0,
      description: "Welcome bonus for joining SocialFi",
      status: "DISTRIBUTED",
    },
  });

  // Alice earned referral bonus from Bob's signup activity
  await prisma.rewardTransaction.create({
    data: {
      userId: alice.id,
      type: "REFERRAL_BONUS",
      amount: 0.5,
      description: "Affiliate bonus from referred user's activity",
      sourceUserId: bob.id,
      referralRate: 0.05,
      status: "PENDING",
    },
  });

  // Update user balances to match seed data
  await prisma.user.update({
    where: { id: alice.id },
    data: { offChainBalance: 10.5, totalEarned: 10.5 },
  });
  await prisma.user.update({
    where: { id: bob.id },
    data: { offChainBalance: 10.0, totalEarned: 10.0 },
  });

  console.log("  ✅ Reward Transactions created");

  // ── 7. Artist Users ─────────────────────────────────────────────────────
  console.log("  Creating Artist Users...");

  const artist1 = await prisma.user.upsert({
    where: { email: "luna@musicfi.io" },
    update: {},
    create: {
      email: "luna@musicfi.io",
      passwordHash: password,
      username: "luna_beats",
      displayName: "Luna Beats",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "LUNA001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=luna&backgroundColor=b6e3f4",
      bio: "🌙 AI Music Producer | Lo-fi & Ambient | 100k+ streams",
      isVerified: true,
      offChainBalance: 500,
      totalEarned: 2400,
    },
  });

  const artist2 = await prisma.user.upsert({
    where: { email: "kaifire@musicfi.io" },
    update: {},
    create: {
      email: "kaifire@musicfi.io",
      passwordHash: password,
      username: "kai_fire",
      displayName: "Kai Fire",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "KAI0001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=kai&backgroundColor=ffd5dc",
      bio: "🔥 Hip-Hop & Trap | AI-powered bangers | Bangkok based",
      isVerified: true,
      offChainBalance: 320,
      totalEarned: 1800,
    },
  });

  const artist3 = await prisma.user.upsert({
    where: { email: "novasynth@musicfi.io" },
    update: {},
    create: {
      email: "novasynth@musicfi.io",
      passwordHash: password,
      username: "nova_synth",
      displayName: "Nova Synth",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "NOVA001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=nova&backgroundColor=c0aede",
      bio: "⚡ EDM & Electronic | Future Bass | Suno x Udio producer",
      isVerified: true,
      offChainBalance: 250,
      totalEarned: 1200,
    },
  });

  const artist4 = await prisma.user.upsert({
    where: { email: "sakura@musicfi.io" },
    update: {},
    create: {
      email: "sakura@musicfi.io",
      passwordHash: password,
      username: "sakura_melody",
      displayName: "Sakura Melody",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "SAKU001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=sakura&backgroundColor=ffdfbf",
      bio: "🌸 Pop & R&B vocalist | AI harmony | Tokyo → Worldwide",
      isVerified: false,
      offChainBalance: 180,
      totalEarned: 650,
    },
  });

  const artist5 = await prisma.user.upsert({
    where: { email: "atlas@musicfi.io" },
    update: {},
    create: {
      email: "atlas@musicfi.io",
      passwordHash: password,
      username: "atlas_sound",
      displayName: "Atlas Sound",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "ATLS001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=atlas&backgroundColor=d1d4f9",
      bio: "🌍 World Music & Jazz fusion | AI experiments | Berlin",
      isVerified: true,
      offChainBalance: 400,
      totalEarned: 900,
    },
  });

  console.log("  ✅ Artists created:", artist1.username, artist2.username, artist3.username, artist4.username, artist5.username);

  // ── 8. Mock Tracks (Songs) ──────────────────────────────────────────────
  console.log("  Creating Mock Tracks...");

  // Free sample audio URLs from public domain
  const sampleAudios = [
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

  // Cover art from picsum with different seeds
  const cover = (seed: number) => `https://picsum.photos/seed/track${seed}/400/400`;

  const p = prisma as any;

  const trackData = [
    // Luna Beats — Lo-fi & Ambient
    { title: "Midnight Rain", artist: artist1.id, genre: "LOFI", tags: ["lofi","chill","night"], moodTags: ["relaxing","dreamy","peaceful"], bpm: 75, key: "Am", duration: 198, plays: 12840, likes: 892, comments: 34, shares: 156, boosts: 18, reposts: 42, score: 87.3, ai: true, aiModel: "Suno v4", aiPrompt: "lo-fi beats, rain sounds, midnight city vibes", cover: cover(1), audio: sampleAudios[0] },
    { title: "Neon Dreams", artist: artist1.id, genre: "AMBIENT", tags: ["ambient","synthwave","neon"], moodTags: ["dreamy","atmospheric","futuristic"], bpm: 90, key: "C#m", duration: 245, plays: 8420, likes: 623, comments: 21, shares: 88, boosts: 12, reposts: 31, score: 72.1, ai: true, aiModel: "Suno v4", aiPrompt: "ambient synthwave, neon-lit streets, cyberpunk mood", cover: cover(2), audio: sampleAudios[1] },
    { title: "Paper Clouds", artist: artist1.id, genre: "LOFI", tags: ["lofi","study","calm"], moodTags: ["calm","focused","gentle"], bpm: 68, key: "F", duration: 176, plays: 15200, likes: 1102, comments: 45, shares: 210, boosts: 24, reposts: 58, score: 91.5, ai: true, aiModel: "Udio", aiPrompt: "gentle lo-fi piano, soft rain, study session", cover: cover(3), audio: sampleAudios[2] },
    { title: "Starfall", artist: artist1.id, genre: "AMBIENT", tags: ["ambient","space","ethereal"], moodTags: ["ethereal","cosmic","serene"], bpm: 60, key: "Eb", duration: 302, plays: 5600, likes: 410, comments: 12, shares: 67, boosts: 8, reposts: 19, score: 55.2, ai: true, aiModel: "MusicGen", aiPrompt: "cosmic ambient, floating in space, stars falling", cover: cover(4), audio: sampleAudios[3] },

    // Kai Fire — Hip-Hop & Trap
    { title: "Bangkok Drip", artist: artist2.id, genre: "HIPHOP", tags: ["trap","bangkok","flex"], moodTags: ["energetic","confident","bold"], bpm: 140, key: "Gm", duration: 187, plays: 22100, likes: 1890, comments: 78, shares: 345, boosts: 32, reposts: 89, score: 95.8, ai: true, aiModel: "Suno v4", aiPrompt: "hard trap beat, Thai rap vibes, 808 bass heavy", cover: cover(5), audio: sampleAudios[4] },
    { title: "Stack Mode", artist: artist2.id, genre: "HIPHOP", tags: ["hiphop","money","hustle"], moodTags: ["aggressive","motivated","powerful"], bpm: 130, key: "Dm", duration: 210, plays: 18500, likes: 1456, comments: 56, shares: 278, boosts: 28, reposts: 72, score: 89.4, ai: true, aiModel: "Suno v4", aiPrompt: "dark hip-hop, money motivation, deep bass", cover: cover(6), audio: sampleAudios[5] },
    { title: "Ghost Lane", artist: artist2.id, genre: "HIPHOP", tags: ["drill","dark","underground"], moodTags: ["dark","intense","mysterious"], bpm: 145, key: "Bbm", duration: 195, plays: 9870, likes: 780, comments: 32, shares: 134, boosts: 15, reposts: 38, score: 68.9, ai: true, aiModel: "Udio", aiPrompt: "UK drill meets Thai rap, eerie melody, punchy drums", cover: cover(7), audio: sampleAudios[6] },
    { title: "Crypto Kings", artist: artist2.id, genre: "HIPHOP", tags: ["crypto","web3","anthem"], moodTags: ["hype","celebration","futuristic"], bpm: 128, key: "Em", duration: 224, plays: 31200, likes: 2340, comments: 98, shares: 520, boosts: 45, reposts: 112, score: 98.2, ai: true, aiModel: "Suno v4", aiPrompt: "crypto anthem, victory vibes, orchestral trap", cover: cover(8), audio: sampleAudios[7] },

    // Nova Synth — EDM & Electronic
    { title: "Pulse Override", artist: artist3.id, genre: "EDM", tags: ["edm","bass","festival"], moodTags: ["energetic","euphoric","electric"], bpm: 150, key: "F#m", duration: 267, plays: 14300, likes: 1120, comments: 41, shares: 198, boosts: 22, reposts: 51, score: 82.7, ai: true, aiModel: "Suno v4", aiPrompt: "festival EDM, massive drops, future bass elements", cover: cover(9), audio: sampleAudios[8] },
    { title: "Digital Sunrise", artist: artist3.id, genre: "EDM", tags: ["progressive","sunrise","trance"], moodTags: ["uplifting","euphoric","hopeful"], bpm: 138, key: "Ab", duration: 312, plays: 11200, likes: 890, comments: 29, shares: 145, boosts: 19, reposts: 43, score: 76.4, ai: true, aiModel: "Udio", aiPrompt: "progressive house, sunrise melody, uplifting breakdown", cover: cover(10), audio: sampleAudios[9] },
    { title: "Glitch City", artist: artist3.id, genre: "EDM", tags: ["glitch","experimental","bass"], moodTags: ["chaotic","futuristic","intense"], bpm: 160, key: "Cm", duration: 198, plays: 7800, likes: 560, comments: 18, shares: 89, boosts: 10, reposts: 24, score: 58.3, ai: true, aiModel: "MusicGen", aiPrompt: "glitch hop, broken beats, digital chaos", cover: cover(11), audio: sampleAudios[0] },
    { title: "Velocity", artist: artist3.id, genre: "EDM", tags: ["dubstep","heavy","drop"], moodTags: ["aggressive","powerful","explosive"], bpm: 150, key: "D", duration: 234, plays: 19800, likes: 1670, comments: 62, shares: 310, boosts: 30, reposts: 78, score: 90.1, ai: true, aiModel: "Suno v4", aiPrompt: "heavy dubstep, massive wobble bass, festival destroyer", cover: cover(12), audio: sampleAudios[1] },

    // Sakura Melody — Pop & R&B
    { title: "Cherry Blossom Love", artist: artist4.id, genre: "POP", tags: ["pop","love","japanese"], moodTags: ["romantic","sweet","nostalgic"], bpm: 112, key: "G", duration: 203, plays: 8900, likes: 720, comments: 28, shares: 112, boosts: 14, reposts: 35, score: 69.8, ai: true, aiModel: "Suno v4", aiPrompt: "J-pop style love song, cherry blossom theme, sweet vocals", cover: cover(13), audio: sampleAudios[2] },
    { title: "Heartbeat", artist: artist4.id, genre: "RNB", tags: ["rnb","soul","vocal"], moodTags: ["emotional","warm","intimate"], bpm: 95, key: "Bb", duration: 228, plays: 6400, likes: 510, comments: 19, shares: 78, boosts: 9, reposts: 22, score: 52.6, ai: true, aiModel: "Udio", aiPrompt: "smooth R&B, heartfelt vocals, piano ballad", cover: cover(14), audio: sampleAudios[3] },
    { title: "Neon Tokyo", artist: artist4.id, genre: "POP", tags: ["pop","city","nightlife"], moodTags: ["vibrant","exciting","urban"], bpm: 120, key: "A", duration: 191, plays: 10500, likes: 830, comments: 33, shares: 145, boosts: 17, reposts: 40, score: 74.2, ai: true, aiModel: "Suno v4", aiPrompt: "J-pop meets K-pop, neon city nights, catchy hook", cover: cover(15), audio: sampleAudios[4] },
    { title: "Whisper", artist: artist4.id, genre: "RNB", tags: ["rnb","chill","late night"], moodTags: ["sensual","smooth","intimate"], bpm: 88, key: "Db", duration: 256, plays: 4200, likes: 340, comments: 11, shares: 45, boosts: 5, reposts: 14, score: 41.0, ai: false, aiModel: undefined, aiPrompt: undefined, cover: cover(16), audio: sampleAudios[5] },

    // Atlas Sound — World & Jazz
    { title: "Sahara Wind", artist: artist5.id, genre: "WORLD", tags: ["world","desert","ethnic"], moodTags: ["mystical","adventurous","warm"], bpm: 100, key: "E", duration: 278, plays: 7300, likes: 590, comments: 22, shares: 98, boosts: 11, reposts: 28, score: 60.5, ai: true, aiModel: "MusicGen", aiPrompt: "Saharan desert vibes, ethnic percussion, oud melody", cover: cover(17), audio: sampleAudios[6] },
    { title: "Berlin Nights", artist: artist5.id, genre: "JAZZ", tags: ["jazz","berlin","club"], moodTags: ["sophisticated","cool","smoky"], bpm: 110, key: "Fm", duration: 315, plays: 5100, likes: 420, comments: 16, shares: 67, boosts: 7, reposts: 18, score: 48.9, ai: true, aiModel: "Suno v4", aiPrompt: "modern jazz, Berlin club atmosphere, saxophone solo", cover: cover(18), audio: sampleAudios[7] },
    { title: "Monsoon", artist: artist5.id, genre: "WORLD", tags: ["world","rain","indian"], moodTags: ["meditative","flowing","peaceful"], bpm: 85, key: "C", duration: 290, plays: 9600, likes: 780, comments: 30, shares: 132, boosts: 16, reposts: 39, score: 71.3, ai: true, aiModel: "Udio", aiPrompt: "Indian classical fusion, monsoon rain, sitar and tabla", cover: cover(19), audio: sampleAudios[8] },
    { title: "Atlas Rising", artist: artist5.id, genre: "EXPERIMENTAL", tags: ["experimental","fusion","cinematic"], moodTags: ["epic","cinematic","grand"], bpm: 105, key: "Gm", duration: 340, plays: 3800, likes: 310, comments: 14, shares: 52, boosts: 6, reposts: 15, score: 38.7, ai: true, aiModel: "MusicGen", aiPrompt: "cinematic world fusion, orchestral meets electronic, epic journey", cover: cover(20), audio: sampleAudios[9] },
  ];

  const createdTracks: any[] = [];
  for (const t of trackData) {
    const track = await p.track.create({
      data: {
        title: t.title,
        description: `${t.title} — produced by AI`,
        genre: t.genre,
        tags: t.tags,
        moodTags: t.moodTags,
        bpm: t.bpm,
        key: t.key,
        duration: t.duration,
        isAiGenerated: t.ai,
        aiModel: t.aiModel,
        aiPrompt: t.aiPrompt,
        audioUrl: t.audio,
        coverUrl: t.cover,
        playCount: t.plays,
        likeCount: t.likes,
        commentCount: t.comments,
        shareCount: t.shares,
        boostCount: t.boosts,
        repostCount: t.reposts,
        engagementScore: t.score,
        status: "PUBLISHED",
        artistId: t.artist,
        publishedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      },
    });
    createdTracks.push(track);
  }

  console.log(`  ✅ ${createdTracks.length} Mock Tracks created`);

  // ── 9. Music NFTs (for top tracks) ──────────────────────────────────────
  console.log("  Creating Music NFTs...");

  const nftTracks = [
    { idx: 4, name: "Bangkok Drip — Collector's Edition", supply: 100, price: 10, royalty: 12 },
    { idx: 7, name: "Crypto Kings — Diamond NFT", supply: 50, price: 25, royalty: 15 },
    { idx: 2, name: "Paper Clouds — Zen Collection", supply: 200, price: 3, royalty: 8 },
    { idx: 8, name: "Pulse Override — Festival Pass", supply: 150, price: 5, royalty: 10 },
    { idx: 11, name: "Velocity — Limited Drop", supply: 75, price: 15, royalty: 12 },
    { idx: 14, name: "Neon Tokyo — City Edition", supply: 120, price: 4, royalty: 8 },
    { idx: 18, name: "Monsoon — Meditation Series", supply: 300, price: 2, royalty: 6 },
    { idx: 0, name: "Midnight Rain — Dreamer's Pass", supply: 80, price: 8, royalty: 10 },
  ];

  for (const n of nftTracks) {
    const track = createdTracks[n.idx];
    const soldCount = Math.floor(n.supply * (0.15 + Math.random() * 0.5));
    await p.musicNFT.create({
      data: {
        trackId: track.id,
        artistId: track.artistId,
        name: n.name,
        description: `Own a fraction of "${track.title}" and earn streaming royalties.`,
        coverUrl: track.coverUrl,
        totalSupply: n.supply,
        availableSupply: n.supply - soldCount,
        pricePerFraction: n.price,
        royaltyPercent: n.royalty,
        totalStreamingRevenue: track.playCount * 0.004,
        isMinted: true,
        isListed: true,
      },
    });
  }

  console.log(`  ✅ ${nftTracks.length} Music NFTs created`);

  // ── 10. Sample Boosts ───────────────────────────────────────────────────
  console.log("  Creating Sample Boosts...");

  const boostUsers = [alice, bob, artist1, artist2, artist3, artist4, artist5];
  let boostCount = 0;
  for (let i = 0; i < 15; i++) {
    const randomTrack = createdTracks[Math.floor(Math.random() * createdTracks.length)];
    const randomUser = boostUsers[Math.floor(Math.random() * boostUsers.length)];
    const tiers = ["BASIC", "BASIC", "BASIC", "PREMIUM", "PREMIUM", "SUPER"] as const;
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const costMap = { BASIC: 1, PREMIUM: 5, SUPER: 20 };

    try {
      await p.musicBoost.create({
        data: {
          trackId: randomTrack.id,
          boosterId: randomUser.id,
          tier,
          tokensCost: costMap[tier],
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      boostCount++;
    } catch { /* skip duplicates */ }
  }

  console.log(`  ✅ ${boostCount} Sample Boosts created`);

  // ── 11. Sample Track Reposts ────────────────────────────────────────────
  console.log("  Creating Sample Reposts...");

  let repostCount = 0;
  for (let i = 0; i < 20; i++) {
    const randomTrack = createdTracks[Math.floor(Math.random() * createdTracks.length)];
    const randomUser = boostUsers[Math.floor(Math.random() * boostUsers.length)];
    if (randomTrack.artistId === randomUser.id) continue; // can't repost own track

    try {
      await p.trackRepost.create({
        data: {
          trackId: randomTrack.id,
          userId: randomUser.id,
          message: ["🔥 This track slaps!", "Must listen!", "Incredible vibes ✨", "On repeat all day 🎧", "Best AI track I've heard"][Math.floor(Math.random() * 5)],
          rewardEarned: +(0.3 + Math.random() * 0.7).toFixed(2),
        },
      });
      repostCount++;
    } catch { /* skip duplicates */ }
  }

  console.log(`  ✅ ${repostCount} Sample Reposts created`);

  // ── 12. Engagement Scores ───────────────────────────────────────────────
  console.log("  Creating Engagement Scores...");

  for (const u of boostUsers) {
    const score = 40 + Math.floor(Math.random() * 55);
    try {
      await p.engagementScore.create({
        data: {
          userId: u.id,
          score,
          totalActions: 10 + Math.floor(Math.random() * 90),
          validActions: 8 + Math.floor(Math.random() * 70),
          spamActions: Math.floor(Math.random() * 3),
          isFlagged: false,
        },
      });
    } catch { /* skip if exists */ }
  }

  console.log("  ✅ Engagement Scores created");

  console.log("\n✅ Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Test credentials (all passwords: Password123!)");
  console.log("  Admin:    admin@socialfi.app");
  console.log("  User:     alice@example.com");
  console.log("  User:     bob@example.com");
  console.log("  Merchant: merchant@nftstore.io");
  console.log("  Artist:   luna@musicfi.io");
  console.log("  Artist:   kaifire@musicfi.io");
  console.log("  Artist:   novasynth@musicfi.io");
  console.log("  Artist:   sakura@musicfi.io");
  console.log("  Artist:   atlas@musicfi.io");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  🎵 ${createdTracks.length} tracks | 🖼️ ${nftTracks.length} NFTs | ⚡ ${boostCount} boosts | 🔁 ${repostCount} reposts`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
