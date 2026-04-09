import { PrismaClient, UserRole, AuthProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const p = prisma as any;

const PASSWORD = "Password123!";
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

const AUDIO_POOL = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
];

const coverUrl = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/640`;

async function ensureCoreServices() {
  const adPackageCount = await prisma.adPackage.count();
  if (adPackageCount === 0) {
    await prisma.adPackage.createMany({
      data: [
        { id: "pkg-starter", name: "Starter", description: "Perfect for small businesses testing the platform.", priceFiat: 49.0, priceCrypto: 49.0, impressions: 5000, durationDays: 7, maxPosts: 1, totalRewardPool: 500, sortOrder: 1 },
        { id: "pkg-growth", name: "Growth", description: "Best value for growing brands.", priceFiat: 149.0, priceCrypto: 149.0, impressions: 20000, durationDays: 14, maxPosts: 3, totalRewardPool: 2000, sortOrder: 2 },
        { id: "pkg-enterprise", name: "Enterprise", description: "Maximum reach for serious advertisers.", priceFiat: 499.0, priceCrypto: 499.0, impressions: 100000, durationDays: 30, maxPosts: 10, totalRewardPool: 10000, sortOrder: 3 },
      ],
      skipDuplicates: true,
    });
  }

  const paidServicesCount = await prisma.paidService.count();
  if (paidServicesCount === 0) {
    await prisma.paidService.createMany({
      data: [
        { name: "Boost Post", description: "Boost your post to reach 5x more users for 7 days.", type: "BOOST_POST", priceUsd: 4.99, durationDays: 7, sortOrder: 1 },
        { name: "Premium Badge", description: "Stand out with a premium badge on your profile.", type: "PREMIUM_BADGE", priceUsd: 9.99, durationDays: 30, sortOrder: 2 },
        { name: "Analytics Pro", description: "Unlock advanced analytics with audience insights.", type: "ANALYTICS_PRO", priceUsd: 14.99, durationDays: 30, sortOrder: 3 },
        { name: "Verified Badge", description: "Get a permanent verified badge on your profile.", type: "VERIFIED_BADGE", priceUsd: 29.99, durationDays: null, sortOrder: 4 },
        { name: "Extra Storage", description: "Unlock 10GB extra media storage for uploads.", type: "EXTRA_STORAGE", priceUsd: 4.99, durationDays: 30, sortOrder: 5 },
      ],
      skipDuplicates: true,
    });
  }
}

async function upsertArtists() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const artistDefs = [
    { email: "luna@musicfi.io", username: "luna_beats", displayName: "Luna Beats", bio: "Moonlit lo-fi architect shaping nocturnal study sessions.", genre: "LOFI", verified: true, earned: 2400, balance: 500 },
    { email: "kaifire@musicfi.io", username: "kai_fire", displayName: "Kai Fire", bio: "Bangkok trap specialist making AI rap records feel stadium-sized.", genre: "HIPHOP", verified: true, earned: 1800, balance: 320 },
    { email: "novasynth@musicfi.io", username: "nova_synth", displayName: "Nova Synth", bio: "Festival-scale electronic producer built on Suno and Udio workflows.", genre: "EDM", verified: true, earned: 1200, balance: 250 },
    { email: "sakura@musicfi.io", username: "sakura_melody", displayName: "Sakura Melody", bio: "Warm pop and R&B hooks with cinematic AI vocal layers.", genre: "POP", verified: false, earned: 650, balance: 180 },
    { email: "atlas@musicfi.io", username: "atlas_sound", displayName: "Atlas Sound", bio: "World and jazz fusion producer building meditative global hybrids.", genre: "WORLD", verified: true, earned: 900, balance: 400 },
    { email: "vela@musicfi.io", username: "vela_echo", displayName: "Vela Echo", bio: "Cloud-pop producer turning intimate voice notes into polished AI singles.", genre: "RNB", verified: true, earned: 1420, balance: 210 },
    { email: "orion@musicfi.io", username: "orion_grid", displayName: "Orion Grid", bio: "Cyber-club architect designing industrial dance records for late-night sets.", genre: "EXPERIMENTAL", verified: true, earned: 1630, balance: 285 },
    { email: "mira@musicfi.io", username: "mira_flux", displayName: "Mira Flux", bio: "Future-pop songwriter blending anime brightness with machine precision.", genre: "POP", verified: true, earned: 1325, balance: 195 },
  ];

  const artists: Record<string, any> = {};
  for (const artist of artistDefs) {
    artists[artist.username] = await prisma.user.upsert({
      where: { email: artist.email },
      update: {
        displayName: artist.displayName,
        bio: artist.bio,
        isVerified: artist.verified,
        totalEarned: artist.earned,
        offChainBalance: artist.balance,
        subscriptionTier: "CREATOR" as any,
        uploadCredits: 9000,
      },
      create: {
        email: artist.email,
        passwordHash,
        username: artist.username,
        displayName: artist.displayName,
        role: UserRole.USER,
        authProvider: AuthProvider.EMAIL,
        referralCode: artist.username.toUpperCase(),
        avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${artist.username}`,
        bio: artist.bio,
        isVerified: artist.verified,
        totalEarned: artist.earned,
        offChainBalance: artist.balance,
        subscriptionTier: "CREATOR" as any,
        uploadCredits: 9000,
      } as any,
    });
  }

  return artists;
}

async function ensureTrack(trackDef: any, artists: Record<string, any>, index: number) {
  const artist = artists[trackDef.artist];
  const existing = await prisma.track.findFirst({
    where: { title: trackDef.title, artistId: artist.id },
  });
  if (existing) return existing;

  return p.track.create({
    data: {
      title: trackDef.title,
      description: trackDef.description,
      lyrics: trackDef.lyrics,
      genre: trackDef.genre,
      tags: trackDef.tags,
      moodTags: trackDef.moodTags,
      bpm: trackDef.bpm,
      key: trackDef.key,
      duration: trackDef.duration,
      isAiGenerated: true,
      aiModel: trackDef.aiModel,
      aiPrompt: trackDef.aiPrompt,
      audioUrl: AUDIO_POOL[index % AUDIO_POOL.length],
      coverUrl: coverUrl(trackDef.title),
      playCount: trackDef.playCount,
      likeCount: trackDef.likeCount,
      commentCount: trackDef.commentCount,
      shareCount: trackDef.shareCount,
      boostCount: trackDef.boostCount,
      repostCount: trackDef.repostCount,
      engagementScore: trackDef.engagementScore,
      totalRevenue: trackDef.totalRevenue,
      status: "PUBLISHED",
      artistId: artist.id,
      publishedAt: new Date(Date.now() - trackDef.daysAgo * 24 * 60 * 60 * 1000),
    },
  });
}

async function seedTracks(artists: Record<string, any>) {
  const defs = [
    { artist: "luna_beats", title: "Midnight Rain", genre: "LOFI", description: "Lo-fi city rain with soft piano dust.", lyrics: "Midnight rain on window panes / study lights and silver trains", tags: ["lofi", "rain", "night"], moodTags: ["peaceful", "dreamy"], bpm: 75, key: "Am", duration: 198, playCount: 12840, likeCount: 892, commentCount: 34, shareCount: 156, boostCount: 18, repostCount: 42, engagementScore: 87.3, totalRevenue: 51.36, aiModel: "Suno v4", aiPrompt: "lo-fi beats, rain sounds, midnight city vibes", daysAgo: 21 },
    { artist: "luna_beats", title: "Paper Clouds", genre: "LOFI", description: "A drifting tape-loop for deep focus.", lyrics: "Paper clouds over notebooks / coffee steam and open books", tags: ["study", "lofi", "calm"], moodTags: ["focused", "gentle"], bpm: 68, key: "F", duration: 176, playCount: 15200, likeCount: 1102, commentCount: 45, shareCount: 210, boostCount: 24, repostCount: 58, engagementScore: 91.5, totalRevenue: 60.8, aiModel: "Udio", aiPrompt: "gentle lo-fi piano, soft rain, study session", daysAgo: 15 },
    { artist: "luna_beats", title: "Starfall", genre: "AMBIENT", description: "Weightless ambient textures for late-night headphones.", lyrics: "No lyrics - ambient instrumental", tags: ["ambient", "space", "ethereal"], moodTags: ["cosmic", "serene"], bpm: 60, key: "Eb", duration: 302, playCount: 5600, likeCount: 410, commentCount: 12, shareCount: 67, boostCount: 8, repostCount: 19, engagementScore: 55.2, totalRevenue: 22.4, aiModel: "MusicGen", aiPrompt: "cosmic ambient, floating in space, stars falling", daysAgo: 32 },
    { artist: "kai_fire", title: "Bangkok Drip", genre: "HIPHOP", description: "A trap anthem built for neon intersections and rooftop flexes.", lyrics: "Bangkok lights on the chrome / built this sound from a phone", tags: ["trap", "bangkok", "flex"], moodTags: ["energetic", "bold"], bpm: 140, key: "Gm", duration: 187, playCount: 22100, likeCount: 1890, commentCount: 78, shareCount: 345, boostCount: 32, repostCount: 89, engagementScore: 95.8, totalRevenue: 88.4, aiModel: "Suno v4", aiPrompt: "hard trap beat, Thai rap vibes, 808 bass heavy", daysAgo: 11 },
    { artist: "kai_fire", title: "Stack Mode", genre: "HIPHOP", description: "Dark hip-hop for hustle edits and workout loops.", lyrics: "Stack mode every night / tunnel vision in the light", tags: ["hiphop", "money", "hustle"], moodTags: ["aggressive", "powerful"], bpm: 130, key: "Dm", duration: 210, playCount: 18500, likeCount: 1456, commentCount: 56, shareCount: 278, boostCount: 28, repostCount: 72, engagementScore: 89.4, totalRevenue: 74.0, aiModel: "Suno v4", aiPrompt: "dark hip-hop, money motivation, deep bass", daysAgo: 9 },
    { artist: "kai_fire", title: "Crypto Kings", genre: "HIPHOP", description: "Victory-lap anthem for token-native creators.", lyrics: "Crypto kings in the frame / mint the future, sign the name", tags: ["crypto", "web3", "anthem"], moodTags: ["hype", "celebration"], bpm: 128, key: "Em", duration: 224, playCount: 31200, likeCount: 2340, commentCount: 98, shareCount: 520, boostCount: 45, repostCount: 112, engagementScore: 98.2, totalRevenue: 124.8, aiModel: "Suno v4", aiPrompt: "crypto anthem, victory vibes, orchestral trap", daysAgo: 5 },
    { artist: "nova_synth", title: "Pulse Override", genre: "EDM", description: "Future-bass festival opener with huge melodic lift.", lyrics: "No lyrics - EDM instrumental", tags: ["edm", "festival", "futurebass"], moodTags: ["euphoric", "electric"], bpm: 150, key: "F#m", duration: 267, playCount: 14300, likeCount: 1120, commentCount: 41, shareCount: 198, boostCount: 22, repostCount: 51, engagementScore: 82.7, totalRevenue: 57.2, aiModel: "Suno v4", aiPrompt: "festival EDM, massive drops, future bass elements", daysAgo: 17 },
    { artist: "nova_synth", title: "Digital Sunrise", genre: "EDM", description: "Progressive sunrise set music for open-air stages.", lyrics: "No lyrics - EDM instrumental", tags: ["progressive", "sunrise", "trance"], moodTags: ["uplifting", "hopeful"], bpm: 138, key: "Ab", duration: 312, playCount: 11200, likeCount: 890, commentCount: 29, shareCount: 145, boostCount: 19, repostCount: 43, engagementScore: 76.4, totalRevenue: 44.8, aiModel: "Udio", aiPrompt: "progressive house, sunrise melody, uplifting breakdown", daysAgo: 26 },
    { artist: "nova_synth", title: "Velocity", genre: "EDM", description: "Heavy drop-centric crowd favorite with touring energy.", lyrics: "No lyrics - EDM instrumental", tags: ["dubstep", "drop", "heavy"], moodTags: ["explosive", "powerful"], bpm: 150, key: "D", duration: 234, playCount: 19800, likeCount: 1670, commentCount: 62, shareCount: 310, boostCount: 30, repostCount: 78, engagementScore: 90.1, totalRevenue: 79.2, aiModel: "Suno v4", aiPrompt: "heavy dubstep, massive wobble bass, festival destroyer", daysAgo: 8 },
    { artist: "sakura_melody", title: "Cherry Blossom Love", genre: "POP", description: "Bright AI pop written like a spring confession scene.", lyrics: "Cherry blossom skies tonight / say it once and hold me tight", tags: ["pop", "love", "spring"], moodTags: ["romantic", "sweet"], bpm: 112, key: "G", duration: 203, playCount: 8900, likeCount: 720, commentCount: 28, shareCount: 112, boostCount: 14, repostCount: 35, engagementScore: 69.8, totalRevenue: 35.6, aiModel: "Suno v4", aiPrompt: "J-pop style love song, cherry blossom theme, sweet vocals", daysAgo: 18 },
    { artist: "sakura_melody", title: "Neon Tokyo", genre: "POP", description: "City-pop pulse with a K-pop polished chorus.", lyrics: "Neon Tokyo calling me / lights rewrite the melody", tags: ["pop", "city", "nightlife"], moodTags: ["vibrant", "urban"], bpm: 120, key: "A", duration: 191, playCount: 10500, likeCount: 830, commentCount: 33, shareCount: 145, boostCount: 17, repostCount: 40, engagementScore: 74.2, totalRevenue: 42.0, aiModel: "Suno v4", aiPrompt: "J-pop meets K-pop, neon city nights, catchy hook", daysAgo: 13 },
    { artist: "atlas_sound", title: "Monsoon", genre: "WORLD", description: "Rain-soaked world fusion built around sitar textures.", lyrics: "No lyrics - instrumental fusion", tags: ["world", "rain", "fusion"], moodTags: ["meditative", "flowing"], bpm: 85, key: "C", duration: 290, playCount: 9600, likeCount: 780, commentCount: 30, shareCount: 132, boostCount: 16, repostCount: 39, engagementScore: 71.3, totalRevenue: 38.4, aiModel: "Udio", aiPrompt: "Indian classical fusion, monsoon rain, sitar and tabla", daysAgo: 24 },
    { artist: "atlas_sound", title: "Atlas Rising", genre: "EXPERIMENTAL", description: "Cinematic global-electronic score for a hero reveal.", lyrics: "No lyrics - cinematic instrumental", tags: ["cinematic", "fusion", "epic"], moodTags: ["grand", "epic"], bpm: 105, key: "Gm", duration: 340, playCount: 3800, likeCount: 310, commentCount: 14, shareCount: 52, boostCount: 6, repostCount: 15, engagementScore: 38.7, totalRevenue: 15.2, aiModel: "MusicGen", aiPrompt: "cinematic world fusion, orchestral meets electronic, epic journey", daysAgo: 41 },
    { artist: "vela_echo", title: "Afterglow Voice Note", genre: "RNB", description: "Soft R&B memo turned into a polished streaming single.", lyrics: "Left a voice note in the dark / now it glows like city sparks", tags: ["rnb", "soft", "late-night"], moodTags: ["intimate", "warm"], bpm: 94, key: "Bm", duration: 214, playCount: 11800, likeCount: 940, commentCount: 39, shareCount: 168, boostCount: 18, repostCount: 47, engagementScore: 78.8, totalRevenue: 47.2, aiModel: "Udio", aiPrompt: "soft alt-R&B, intimate female vocal, midnight memo", daysAgo: 12 },
    { artist: "vela_echo", title: "Glass Hearts", genre: "RNB", description: "A shimmering heartbreak record for short-form emotional edits.", lyrics: "Glass hearts in the rearview / every crack still sees you", tags: ["rnb", "heartbreak", "viral"], moodTags: ["emotional", "shimmering"], bpm: 102, key: "E", duration: 226, playCount: 13400, likeCount: 1060, commentCount: 44, shareCount: 187, boostCount: 20, repostCount: 50, engagementScore: 81.9, totalRevenue: 53.6, aiModel: "Suno v4", aiPrompt: "alt-R&B heartbreak single, crystal textures, intimate chorus", daysAgo: 7 },
    { artist: "vela_echo", title: "Low Battery Romance", genre: "POP", description: "Future-pop hook machine built from exhausted-phone energy.", lyrics: "One percent but still alive / we made sparks before goodbye", tags: ["futurepop", "hook", "phonecore"], moodTags: ["playful", "electric"], bpm: 118, key: "C#m", duration: 188, playCount: 9200, likeCount: 715, commentCount: 27, shareCount: 121, boostCount: 14, repostCount: 33, engagementScore: 68.4, totalRevenue: 36.8, aiModel: "Suno v4", aiPrompt: "future-pop, playful hooks, exhausted phone battery romance", daysAgo: 19 },
    { artist: "orion_grid", title: "Chrome District", genre: "EXPERIMENTAL", description: "Industrial dancefloor pressure with metallic percussion grids.", lyrics: "No lyrics - club instrumental", tags: ["industrial", "club", "cyber"], moodTags: ["intense", "mechanical"], bpm: 132, key: "Fm", duration: 244, playCount: 7600, likeCount: 622, commentCount: 23, shareCount: 95, boostCount: 13, repostCount: 29, engagementScore: 63.7, totalRevenue: 30.4, aiModel: "MusicGen", aiPrompt: "industrial club, metallic percussion, dark warehouse energy", daysAgo: 27 },
    { artist: "orion_grid", title: "Machine Parade", genre: "EDM", description: "A hard-hitting synthetic march made for synchronized visuals.", lyrics: "No lyrics - club instrumental", tags: ["edm", "industrial", "parade"], moodTags: ["marching", "heavy"], bpm: 136, key: "D#m", duration: 231, playCount: 8400, likeCount: 688, commentCount: 26, shareCount: 102, boostCount: 15, repostCount: 31, engagementScore: 66.5, totalRevenue: 33.6, aiModel: "Suno v4", aiPrompt: "industrial EDM, machine march, synchronized visual anthem", daysAgo: 14 },
    { artist: "orion_grid", title: "Afterimage Club", genre: "EXPERIMENTAL", description: "Dark-room electro with a high-end cyberpunk finish.", lyrics: "No lyrics - club instrumental", tags: ["electro", "darkroom", "cyberpunk"], moodTags: ["cold", "sleek"], bpm: 128, key: "Am", duration: 219, playCount: 6800, likeCount: 540, commentCount: 19, shareCount: 84, boostCount: 11, repostCount: 24, engagementScore: 57.1, totalRevenue: 27.2, aiModel: "Udio", aiPrompt: "dark electro club, cyberpunk afterimage, sleek and cold", daysAgo: 22 },
    { artist: "mira_flux", title: "Candy Orbit", genre: "POP", description: "Anime-bright future-pop with satellite-sized hooks.", lyrics: "Spin me through a candy orbit / every chorus makes me want it", tags: ["futurepop", "anime", "bright"], moodTags: ["buoyant", "sparkling"], bpm: 124, key: "B", duration: 205, playCount: 16400, likeCount: 1324, commentCount: 49, shareCount: 220, boostCount: 23, repostCount: 55, engagementScore: 86.1, totalRevenue: 65.6, aiModel: "Suno v4", aiPrompt: "anime bright future-pop, satellite hooks, glossy chorus", daysAgo: 10 },
    { artist: "mira_flux", title: "Signal Bloom", genre: "POP", description: "Shiny AI pop tuned for playlist retention and replay value.", lyrics: "Signal bloom inside my chest / every replay sounds the best", tags: ["playlist", "glossy", "pop"], moodTags: ["upbeat", "confident"], bpm: 122, key: "F#", duration: 196, playCount: 14700, likeCount: 1189, commentCount: 42, shareCount: 198, boostCount: 21, repostCount: 49, engagementScore: 83.4, totalRevenue: 58.8, aiModel: "Udio", aiPrompt: "glossy AI pop, replayable chorus, playlist magnet", daysAgo: 6 },
    { artist: "mira_flux", title: "Mirror Arcade", genre: "POP", description: "Retro-futurist dance-pop with arcade shimmer.", lyrics: "Mirror arcade lights us up / pixel hearts and silver luck", tags: ["arcade", "retro", "dancepop"], moodTags: ["playful", "nostalgic"], bpm: 126, key: "G", duration: 212, playCount: 12600, likeCount: 1015, commentCount: 35, shareCount: 173, boostCount: 18, repostCount: 41, engagementScore: 79.6, totalRevenue: 50.4, aiModel: "Suno v4", aiPrompt: "retro future dance-pop, arcade shimmer, bright female chorus", daysAgo: 16 },
  ];

  const tracks: any[] = [];
  for (const [index, def] of defs.entries()) {
    tracks.push(await ensureTrack(def, artists, index));
  }

  return tracks;
}

async function ensureCompetition(year: number, month: number, status: string, startDate: Date, endDate: Date, finalizedAt?: Date | null) {
  return p.monthlyCompetition.upsert({
    where: { year_month: { year, month } },
    update: { status, startDate, endDate, finalizedAt: finalizedAt ?? null },
    create: { year, month, status, startDate, endDate, finalizedAt: finalizedAt ?? null },
  });
}

async function seedCompetitionState(tracks: any[]) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentCompetition = await ensureCompetition(
    currentYear,
    currentMonth,
    "OPEN",
    new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
    new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59)),
  );

  const currentEntries = [
    { title: "Crypto Kings", totalScore: 98.2, voteScore: 32.8, listenScore: 40.4, likeScore: 25.0 },
    { title: "Bangkok Drip", totalScore: 95.8, voteScore: 31.2, listenScore: 39.6, likeScore: 25.0 },
    { title: "Paper Clouds", totalScore: 91.5, voteScore: 27.5, listenScore: 38.0, likeScore: 26.0 },
    { title: "Velocity", totalScore: 90.1, voteScore: 29.1, listenScore: 36.0, likeScore: 25.0 },
    { title: "Midnight Rain", totalScore: 87.3, voteScore: 25.7, listenScore: 35.6, likeScore: 26.0 },
    { title: "Candy Orbit", totalScore: 86.1, voteScore: 24.1, listenScore: 35.0, likeScore: 27.0 },
    { title: "Signal Bloom", totalScore: 83.4, voteScore: 23.4, listenScore: 33.0, likeScore: 27.0 },
    { title: "Pulse Override", totalScore: 82.7, voteScore: 22.7, listenScore: 33.0, likeScore: 27.0 },
    { title: "Glass Hearts", totalScore: 81.9, voteScore: 22.9, listenScore: 32.0, likeScore: 27.0 },
    { title: "Mirror Arcade", totalScore: 79.6, voteScore: 21.6, listenScore: 31.0, likeScore: 27.0 },
    { title: "Afterglow Voice Note", totalScore: 78.8, voteScore: 21.8, listenScore: 30.0, likeScore: 27.0 },
    { title: "Digital Sunrise", totalScore: 76.4, voteScore: 20.4, listenScore: 29.0, likeScore: 27.0 },
  ];

  const trackMap = new Map(tracks.map((track) => [track.title, track]));
  for (const [index, entry] of currentEntries.entries()) {
    const track = trackMap.get(entry.title);
    if (!track) continue;
    await p.competitionEntry.upsert({
      where: { competitionId_trackId: { competitionId: currentCompetition.id, trackId: track.id } },
      update: {
        voteScore: entry.voteScore,
        listenScore: entry.listenScore,
        likeScore: entry.likeScore,
        totalScore: entry.totalScore,
        rank: index + 1,
        isWinner: index < 10,
      },
      create: {
        competitionId: currentCompetition.id,
        trackId: track.id,
        userId: track.artistId,
        voteScore: entry.voteScore,
        listenScore: entry.listenScore,
        likeScore: entry.likeScore,
        totalScore: entry.totalScore,
        rank: index + 1,
        isWinner: index < 10,
      },
    });
  }

  const pastMonthDate = new Date(Date.UTC(currentYear, currentMonth - 2, 1));
  const pastCompetition = await ensureCompetition(
    pastMonthDate.getUTCFullYear(),
    pastMonthDate.getUTCMonth() + 1,
    "FINALIZED",
    new Date(Date.UTC(pastMonthDate.getUTCFullYear(), pastMonthDate.getUTCMonth(), 1)),
    new Date(Date.UTC(pastMonthDate.getUTCFullYear(), pastMonthDate.getUTCMonth() + 1, 0, 23, 59, 59)),
    new Date(),
  );

  const pastEntries = [
    "Paper Clouds",
    "Midnight Rain",
    "Pulse Override",
    "Cherry Blossom Love",
    "Monsoon",
    "Afterglow Voice Note",
    "Machine Parade",
    "Candy Orbit",
    "Neon Tokyo",
    "Glass Hearts",
  ];

  for (const [index, title] of pastEntries.entries()) {
    const track = trackMap.get(title);
    if (!track) continue;
    const totalScore = 92 - index * 3.4;
    const voteScore = 30 - index * 0.8;
    const listenScore = 35 - index * 1.1;
    const likeScore = 27 - index * 1.5;
    await p.competitionEntry.upsert({
      where: { competitionId_trackId: { competitionId: pastCompetition.id, trackId: track.id } },
      update: { voteScore, listenScore, likeScore, totalScore, rank: index + 1, isWinner: true },
      create: {
        competitionId: pastCompetition.id,
        trackId: track.id,
        userId: track.artistId,
        voteScore,
        listenScore,
        likeScore,
        totalScore,
        rank: index + 1,
        isWinner: true,
      },
    });

    for (const privilege of ["MINT_NFT", "DISTRIBUTION"]) {
      await p.topArtistGrant.upsert({
        where: { userId_trackId_privilege: { userId: track.artistId, trackId: track.id, privilege } },
        update: { competitionId: pastCompetition.id },
        create: { userId: track.artistId, trackId: track.id, competitionId: pastCompetition.id, privilege },
      });
    }
  }
}

async function seedBrochuresAndNfts(tracks: any[]) {
  const brochureTracks = ["Paper Clouds", "Crypto Kings", "Candy Orbit", "Monsoon", "Glass Hearts", "Machine Parade"];
  for (const [index, title] of brochureTracks.entries()) {
    const track = tracks.find((item) => item.title === title);
    if (!track) continue;
    await p.nFTBrochure.upsert({
      where: { trackId: track.id },
      update: {
        name: `${track.title} Brochure Edition`,
        description: `Promotional brochure collectible for ${track.title}.`,
        coverUrl: track.coverUrl,
        price: 15 + index * 5,
      },
      create: {
        trackId: track.id,
        artistId: track.artistId,
        name: `${track.title} Brochure Edition`,
        description: `Promotional brochure collectible for ${track.title}.`,
        coverUrl: track.coverUrl,
        price: 15 + index * 5,
      },
    });
  }

  const nftTracks = ["Crypto Kings", "Paper Clouds", "Velocity", "Candy Orbit", "Monsoon", "Bangkok Drip"];
  for (const [index, title] of nftTracks.entries()) {
    const track = tracks.find((item) => item.title === title);
    if (!track) continue;
    const supply = [50, 200, 75, 120, 300, 100][index];
    const price = [25, 3, 15, 8, 2, 10][index];
    await p.musicNFT.upsert({
      where: { trackId: track.id },
      update: {
        artistId: track.artistId,
        name: `${track.title} Collector NFT`,
        description: `Fractional ownership for ${track.title}.`,
        coverUrl: track.coverUrl,
        totalSupply: supply,
        availableSupply: Math.max(1, Math.floor(supply * 0.45)),
        pricePerFraction: price,
        royaltyPercent: 10,
        totalStreamingRevenue: track.totalRevenue ?? track.playCount * 0.004,
        isMinted: true,
        isListed: true,
      },
      create: {
        trackId: track.id,
        artistId: track.artistId,
        name: `${track.title} Collector NFT`,
        description: `Fractional ownership for ${track.title}.`,
        coverUrl: track.coverUrl,
        totalSupply: supply,
        availableSupply: Math.max(1, Math.floor(supply * 0.45)),
        pricePerFraction: price,
        royaltyPercent: 10,
        totalStreamingRevenue: track.totalRevenue ?? track.playCount * 0.004,
        isMinted: true,
        isListed: true,
      },
    });
  }
}

async function seedEngagement(tracks: any[], artists: Record<string, any>) {
  const fanEmails = ["alice@example.com", "bob@example.com"];
  const fans = await prisma.user.findMany({ where: { email: { in: fanEmails } }, select: { id: true } });
  const listeners = [...Object.values(artists), ...fans];

  for (const listener of listeners) {
    await p.engagementScore.upsert({
      where: { userId: listener.id },
      update: {},
      create: {
        userId: listener.id,
        score: 55 + Math.floor(Math.random() * 35),
        totalActions: 20 + Math.floor(Math.random() * 80),
        validActions: 18 + Math.floor(Math.random() * 70),
        spamActions: Math.floor(Math.random() * 2),
        isFlagged: false,
      },
    });
  }

  const leadTracks = ["Crypto Kings", "Paper Clouds", "Candy Orbit"];
  for (const title of leadTracks) {
    const track = tracks.find((item) => item.title === title);
    if (!track) continue;
    for (const listener of listeners.slice(0, 6)) {
      const existingLike = await prisma.trackLike.findFirst({ where: { trackId: track.id, userId: listener.id } });
      if (!existingLike) {
        await prisma.trackLike.create({ data: { trackId: track.id, userId: listener.id } });
      }
    }
  }
}

async function main() {
  console.log("🎬 Seeding demo showcase...\n");

  await ensureCoreServices();
  const artists = await upsertArtists();
  const tracks = await seedTracks(artists);
  await seedCompetitionState(tracks);
  await seedBrochuresAndNfts(tracks);
  await seedEngagement(tracks, artists);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Demo showcase seed complete");
  console.log(`   Artists: ${Object.keys(artists).length}`);
  console.log(`   Tracks:  ${tracks.length}`);
  console.log("   Live competition: current month seeded");
  console.log("   Past competition: previous month finalized");
  console.log("   Brochures and music NFTs: seeded");
  console.log(`   Demo logins use password: ${PASSWORD}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((error) => {
    console.error("❌ Demo showcase seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());