import { google } from "@ai-sdk/google";

/**
 * Shared Google Generative AI model instances and default provider options.
 * Extend or override these per-request if a specific researcher needs custom settings.
 */

export const geminiFlash = google("gemini-2.5-flash");

export const defaultGoogleProviderOptions = {
  google: {},
} as const;
