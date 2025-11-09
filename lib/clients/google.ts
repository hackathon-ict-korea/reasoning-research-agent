import { google } from "@ai-sdk/google";

/**
 * Shared Google Generative AI model instances and default provider options.
 * Extend or override these per-request if a specific researcher needs custom settings.
 */

export const geminiFlash = google("gemini-2.5-flash");
export const geminiPro = google("gemini-2.5-pro");

export const defaultGoogleProviderOptions = {
  google: {},
} as const;
