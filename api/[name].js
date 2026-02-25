/**
 * api/[name].js — single dynamic Vercel function that routes all /api/<functionName> calls.
 * Handlers live in api/_handlers/ (underscore = not counted as Vercel functions).
 */
import analyzeGenericFile from './_handlers/analyzeGenericFile.js';
import approveOnboardingRequest from './_handlers/approveOnboardingRequest.js';
import autoOnboardingOrchestrator from './_handlers/autoOnboardingOrchestrator.js';
import calculateManagerPerformance from './_handlers/calculateManagerPerformance.js';
import cancelCatalogGeneration from './_handlers/cancelCatalogGeneration.js';
import cleanCatalogSmartly from './_handlers/cleanCatalogSmartly.js';
import deepWebCrawler from './_handlers/deepWebCrawler.js';
import deleteCatalogPermanently from './_handlers/deleteCatalogPermanently.js';
import deleteEntireCatalog from './_handlers/deleteEntireCatalog.js';
import exportBusinessPlanToPdf from './_handlers/exportBusinessPlanToPdf.js';
import exportCatalogToExcel from './_handlers/exportCatalogToExcel.js';
import exportForecastToPdf from './_handlers/exportForecastToPdf.js';
import exportManualForecastToExcel from './_handlers/exportManualForecastToExcel.js';
import generateBusinessPlanText from './_handlers/generateBusinessPlanText.js';
import generateCatalog from './_handlers/generateCatalog.js';
import generateCatalogWorker from './_handlers/generateCatalogWorker.js';
import generateDeeperInsights from './_handlers/generateDeeperInsights.js';
import generateFinancialManagerPreparation from './_handlers/generateFinancialManagerPreparation.js';
import generateStrategicRecommendations from './_handlers/generateStrategicRecommendations.js';
import getFinancialManagers from './_handlers/getFinancialManagers.js';
import importFireberryTasks from './_handlers/importFireberryTasks.js';
import initiateWhatsAppConversation from './_handlers/initiateWhatsAppConversation.js';
import invokeClaude from './_handlers/invokeClaude.js';
import normalizeAndLoadForecast from './_handlers/normalizeAndLoadForecast.js';
import orchestrateBusinessForecast from './_handlers/orchestrateBusinessForecast.js';
import parseBizIboxFile from './_handlers/parseBizIboxFile.js';
import parseFutureRevenueFile from './_handlers/parseFutureRevenueFile.js';
import parseXlsx from './_handlers/parseXlsx.js';
import parseZReport from './_handlers/parseZReport.js';
import processCatalogUpload from './_handlers/processCatalogUpload.js';
import processESNAReport from './_handlers/processESNAReport.js';
import processPurchaseDocument from './_handlers/processPurchaseDocument.js';
import processSmartDocument from './_handlers/processSmartDocument.js';
import requestSupplierQuote from './_handlers/requestSupplierQuote.js';
import scheduleMeeting from './_handlers/scheduleMeeting.js';
import sendWhatsAppMessage from './_handlers/sendWhatsAppMessage.js';
import syncMeetingToFireberry from './_handlers/syncMeetingToFireberry.js';
import syncTaskToFireberry from './_handlers/syncTaskToFireberry.js';
import toggleClientStatus from './_handlers/toggleClientStatus.js';
import uploadManualForecastXlsx from './_handlers/uploadManualForecastXlsx.js';

const handlers = {
  analyzeGenericFile,
  approveOnboardingRequest,
  autoOnboardingOrchestrator,
  calculateManagerPerformance,
  cancelCatalogGeneration,
  cleanCatalogSmartly,
  deepWebCrawler,
  deleteCatalogPermanently,
  deleteEntireCatalog,
  exportBusinessPlanToPdf,
  exportCatalogToExcel,
  exportForecastToPdf,
  exportManualForecastToExcel,
  generateBusinessPlanText,
  generateCatalog,
  generateCatalogWorker,
  generateDeeperInsights,
  generateFinancialManagerPreparation,
  generateStrategicRecommendations,
  getFinancialManagers,
  importFireberryTasks,
  initiateWhatsAppConversation,
  invokeClaude,
  normalizeAndLoadForecast,
  orchestrateBusinessForecast,
  parseBizIboxFile,
  parseFutureRevenueFile,
  parseXlsx,
  parseZReport,
  processCatalogUpload,
  processESNAReport,
  processPurchaseDocument,
  processSmartDocument,
  requestSupplierQuote,
  scheduleMeeting,
  sendWhatsAppMessage,
  syncMeetingToFireberry,
  syncTaskToFireberry,
  toggleClientStatus,
  uploadManualForecastXlsx,
};

export default async function handler(req, res) {
  const { name } = req.query;
  const fn = handlers[name];
  if (!fn) {
    return res.status(404).json({ error: `Unknown function: ${name}` });
  }
  return fn(req, res);
}
