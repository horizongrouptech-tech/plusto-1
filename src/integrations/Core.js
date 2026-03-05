/**
 * Bridge file for legacy Base44-style imports.
 *
 * Many components import integrations as:
 *   import { openRouterAPI } from "@/integrations/Core";
 *
 * The Base44 Vite plugin (legacySDKImports: true) resolves any path containing
 * "/integrations" to its own compat layer UNLESS the file already exists on disk.
 * By creating this file, the plugin finds it first and uses our implementation
 * instead of the Base44 compat shim.
 *
 * All actual logic lives in src/api/integrations.js.
 */
export {
  openRouterAPI,
  UploadFile,
  ExtractDataFromUploadedFile,
  GenerateImage,
  SendEmail,
  SendSMS,
  Core,
} from '../api/integrations';
