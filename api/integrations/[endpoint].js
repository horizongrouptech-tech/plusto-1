/**
 * api/integrations/[endpoint].js — single dynamic Vercel function for all /api/integrations/* calls.
 * Handlers live in api/integrations/_handlers/ (not counted as Vercel functions).
 */
import extractData from './_handlers/extract-data.js';
import generateImage from './_handlers/generate-image.js';
import openRouterAPI from './_handlers/openrouter-api.js';
import sendEmail from './_handlers/send-email.js';
import sendSMS from './_handlers/send-sms.js';
import uploadFile from './_handlers/upload-file.js';

const handlers = {
  'extract-data': extractData,
  'generate-image': generateImage,
  'openrouter-api': openRouterAPI,
  'invoke-llm': openRouterAPI,  // backward compat — remove after full deploy
  'send-email': sendEmail,
  'send-sms': sendSMS,
  'upload-file': uploadFile,
};

export default async function handler(req, res) {
  const { endpoint } = req.query;
  const fn = handlers[endpoint];
  if (!fn) {
    return res.status(404).json({ error: `Unknown integration: ${endpoint}` });
  }
  return fn(req, res);
}
