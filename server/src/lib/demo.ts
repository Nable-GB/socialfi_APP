import { Response } from "express";
import { env } from "../config/env.js";

export function isDemoMode(): boolean {
  return env.DEMO_MODE;
}

export function rejectInDemoMode(
  res: Response,
  message = "This action is disabled in demo mode.",
  status = 403,
): boolean {
  if (!env.DEMO_MODE) {
    return false;
  }

  res.status(status).json({
    error: message,
    demoMode: true,
  });
  return true;
}