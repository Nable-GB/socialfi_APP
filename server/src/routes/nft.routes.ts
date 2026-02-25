import { Router } from "express";
import {
  mintNft,
  listNftForSale,
  cancelListing,
  buyNft,
  getMarketListings,
  getMyNfts,
  getNft,
  getUserNfts,
} from "../controllers/nft.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public routes
router.get("/market", getMarketListings);
router.get("/users/:id", getUserNfts);
router.get("/:id", getNft);

// Auth-required routes
router.post("/mint", requireAuth, mintNft);
router.get("/my", requireAuth, getMyNfts);
router.post("/:id/list", requireAuth, listNftForSale);
router.delete("/listings/:id", requireAuth, cancelListing);
router.post("/listings/:id/buy", requireAuth, buyNft);

export default router;
