import { OpenRouter } from '@openrouter/sdk';

const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
const siteUrl = import.meta.env.VITE_SITE_URL;
const siteName = import.meta.env.VITE_SITE_NAME;

export const openRouter = new OpenRouter({
  apiKey: openRouterApiKey,
  defaultHeaders: {
    'HTTP-Referer': siteUrl, // Optional. Site URL for rankings on openrouter.ai.
    'X-Title': siteName, // Optional. Site title for rankings on openrouter.ai.
  },
});
