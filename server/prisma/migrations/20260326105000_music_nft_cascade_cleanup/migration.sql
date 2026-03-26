ALTER TABLE "music_nft_holders" DROP CONSTRAINT "music_nft_holders_musicNftId_fkey";
ALTER TABLE "royalty_payouts" DROP CONSTRAINT "royalty_payouts_musicNftId_fkey";
ALTER TABLE "music_nfts" DROP CONSTRAINT "music_nfts_trackId_fkey";

ALTER TABLE "music_nfts"
ADD CONSTRAINT "music_nfts_trackId_fkey"
FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "music_nft_holders"
ADD CONSTRAINT "music_nft_holders_musicNftId_fkey"
FOREIGN KEY ("musicNftId") REFERENCES "music_nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "royalty_payouts"
ADD CONSTRAINT "royalty_payouts_musicNftId_fkey"
FOREIGN KEY ("musicNftId") REFERENCES "music_nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
