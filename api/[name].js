/**
 * api/[name].js — single dynamic Vercel function that routes all /api/<functionName> calls.
 * Handlers live in api/_handlers/ (underscore = not counted as Vercel functions).
 */
import analyzeFinancialReport from './_handlers/analyzeFinancialReport.js';
import analyzeGenericFile from './_handlers/analyzeGenericFile.js';
import approveOnboardingRequest from './_handlers/approveOnboardingRequest.js';
import archiveFireberryClient from './_handlers/archiveFireberryClient.js';
import autoOnboardingOrchestrator from './_handlers/autoOnboardingOrchestrator.js';
import backupCodeToS3 from './_handlers/backupCodeToS3.js';
import backupDatabaseToS3 from './_handlers/backupDatabaseToS3.js';
import calculateManagerPerformance from './_handlers/calculateManagerPerformance.js';
import cancelCatalogGeneration from './_handlers/cancelCatalogGeneration.js';
import cancelManualForecastProcess from './_handlers/cancelManualForecastProcess.js';
import checkDelayedGoals from './_handlers/checkDelayedGoals.js';
import checkDelayedTasks from './_handlers/checkDelayedTasks.js';
import cleanCatalogSmartly from './_handlers/cleanCatalogSmartly.js';
import deepSearchOro from './_handlers/deepSearchOro.js';
import deepWebCrawler from './_handlers/deepWebCrawler.js';
import deleteCashFlowPermanently from './_handlers/deleteCashFlowPermanently.js';
import deleteCatalogPermanently from './_handlers/deleteCatalogPermanently.js';
import deleteCustomerProducts from './_handlers/deleteCustomerProducts.js';
import deleteEntireCatalog from './_handlers/deleteEntireCatalog.js';
import deleteOrphanProducts from './_handlers/deleteOrphanProducts.js';
import exportBusinessPlanToPdf from './_handlers/exportBusinessPlanToPdf.js';
import exportCashFlowToExcel from './_handlers/exportCashFlowToExcel.js';
import exportCatalogToExcel from './_handlers/exportCatalogToExcel.js';
import exportForecastToPdf from './_handlers/exportForecastToPdf.js';
import exportManualForecastToExcel from './_handlers/exportManualForecastToExcel.js';
import findAlternativeSuppliersOnline from './_handlers/findAlternativeSuppliersOnline.js';
import fixCatalogProductCount from './_handlers/fixCatalogProductCount.js';
import fixGoalsTaskType from './_handlers/fixGoalsTaskType.js';
import generateBusinessPlanText from './_handlers/generateBusinessPlanText.js';
import generateCatalog from './_handlers/generateCatalog.js';
import generateCatalogBackground from './_handlers/generateCatalogBackground.js';
import generateCatalogWorker from './_handlers/generateCatalogWorker.js';
import generateDeeperInsights from './_handlers/generateDeeperInsights.js';
import generateEmployeeForecastAI from './_handlers/generateEmployeeForecastAI.js';
import generateExpenseForecastAI from './_handlers/generateExpenseForecastAI.js';
import generateFinancialManagerPreparation from './_handlers/generateFinancialManagerPreparation.js';
import generateInitialCatalog from './_handlers/generateInitialCatalog.js';
import generateRecurringTasks from './_handlers/generateRecurringTasks.js';
import generateSalesForecastAI from './_handlers/generateSalesForecastAI.js';
import generateStrategicRecommendations from './_handlers/generateStrategicRecommendations.js';
import getAssignableUsers from './_handlers/getAssignableUsers.js';
import getCatalogStats from './_handlers/getCatalogStats.js';
import getCompanies from './_handlers/getCompanies.js';
import getFinancialManagers from './_handlers/getFinancialManagers.js';
import getFirmographicData from './_handlers/getFirmographicData.js';
import getFundingAndAcquisitionData from './_handlers/getFundingAndAcquisitionData.js';
import getSuggestedSuppliers from './_handlers/getSuggestedSuppliers.js';
import getTechnographicsData from './_handlers/getTechnographicsData.js';
import handleFireberryAccountWebhook from './_handlers/handleFireberryAccountWebhook.js';
import handleWhatsAppFeedback from './_handlers/handleWhatsAppFeedback.js';
import importFireberryMeetings from './_handlers/importFireberryMeetings.js';
import importFireberryTasks from './_handlers/importFireberryTasks.js';
import initiateWhatsAppConversation from './_handlers/initiateWhatsAppConversation.js';
import invokeClaude from './_handlers/invokeClaude.js';
import listBackups from './_handlers/listBackups.js';
import manualBackupTrigger from './_handlers/manualBackupTrigger.js';
import normalizeAndLoadForecast from './_handlers/normalizeAndLoadForecast.js';
import onboardNewCustomer from './_handlers/onboardNewCustomer.js';
import orchestrateBusinessForecast from './_handlers/orchestrateBusinessForecast.js';
import parseBizIboxFile from './_handlers/parseBizIboxFile.js';
import parseFileHeaders from './_handlers/parseFileHeaders.js';
import parseFutureRevenueFile from './_handlers/parseFutureRevenueFile.js';
import parseXlsx from './_handlers/parseXlsx.js';
import parseXlsxManualForecast from './_handlers/parseXlsxManualForecast.js';
import parseZReport from './_handlers/parseZReport.js';
import processCatalogChunkWorker from './_handlers/processCatalogChunkWorker.js';
import processCatalogUpload from './_handlers/processCatalogUpload.js';
import processCatalogWithMapping from './_handlers/processCatalogWithMapping.js';
import processCreditReport from './_handlers/processCreditReport.js';
import processESNAReport from './_handlers/processESNAReport.js';
import processManualForecastSheet from './_handlers/processManualForecastSheet.js';
import processPurchaseDocument from './_handlers/processPurchaseDocument.js';
import processSmartDocument from './_handlers/processSmartDocument.js';
import processTaxAssessment from './_handlers/processTaxAssessment.js';
import receiveLeadWebhook from './_handlers/receiveLeadWebhook.js';
import receiveWhatsAppDataWebhook from './_handlers/receiveWhatsAppDataWebhook.js';
import requestSupplierQuote from './_handlers/requestSupplierQuote.js';
import restoreBackupPreview from './_handlers/restoreBackupPreview.js';
import scheduleMeeting from './_handlers/scheduleMeeting.js';
import scrapeWebsite from './_handlers/scrapeWebsite.js';
import searchCustomers from './_handlers/searchCustomers.js';
import sendWhatsAppMessage from './_handlers/sendWhatsAppMessage.js';
import sendWhatsAppTaskReminder from './_handlers/sendWhatsAppTaskReminder.js';
import syncManagerFromFireberry from './_handlers/syncManagerFromFireberry.js';
import syncMeetingToFireberry from './_handlers/syncMeetingToFireberry.js';
import syncTaskToFireberry from './_handlers/syncTaskToFireberry.js';
import toggleClientStatus from './_handlers/toggleClientStatus.js';
import updateUsersFireberryIds from './_handlers/updateUsersFireberryIds.js';
import uploadManualForecastXlsx from './_handlers/uploadManualForecastXlsx.js';

const handlers = {
  analyzeFinancialReport,
  analyzeGenericFile,
  approveOnboardingRequest,
  archiveFireberryClient,
  autoOnboardingOrchestrator,
  backupCodeToS3,
  backupDatabaseToS3,
  calculateManagerPerformance,
  cancelCatalogGeneration,
  cancelManualForecastProcess,
  checkDelayedGoals,
  checkDelayedTasks,
  cleanCatalogSmartly,
  deepSearchOro,
  deepWebCrawler,
  deleteCashFlowPermanently,
  deleteCatalogPermanently,
  deleteCustomerProducts,
  deleteEntireCatalog,
  deleteOrphanProducts,
  exportBusinessPlanToPdf,
  exportCashFlowToExcel,
  exportCatalogToExcel,
  exportForecastToPdf,
  exportManualForecastToExcel,
  findAlternativeSuppliersOnline,
  fixCatalogProductCount,
  fixGoalsTaskType,
  generateBusinessPlanText,
  generateCatalog,
  generateCatalogBackground,
  generateCatalogWorker,
  generateDeeperInsights,
  generateEmployeeForecastAI,
  generateExpenseForecastAI,
  generateFinancialManagerPreparation,
  generateInitialCatalog,
  generateRecurringTasks,
  generateSalesForecastAI,
  generateStrategicRecommendations,
  getAssignableUsers,
  getCatalogStats,
  getCompanies,
  getFinancialManagers,
  getFirmographicData,
  getFundingAndAcquisitionData,
  getSuggestedSuppliers,
  getTechnographicsData,
  handleFireberryAccountWebhook,
  handleWhatsAppFeedback,
  importFireberryMeetings,
  importFireberryTasks,
  initiateWhatsAppConversation,
  invokeClaude,
  listBackups,
  manualBackupTrigger,
  normalizeAndLoadForecast,
  onboardNewCustomer,
  orchestrateBusinessForecast,
  parseBizIboxFile,
  parseFileHeaders,
  parseFutureRevenueFile,
  parseXlsx,
  parseXlsxManualForecast,
  parseZReport,
  processCatalogChunkWorker,
  processCatalogUpload,
  processCatalogWithMapping,
  processCreditReport,
  processESNAReport,
  processManualForecastSheet,
  processPurchaseDocument,
  processSmartDocument,
  processTaxAssessment,
  receiveLeadWebhook,
  receiveWhatsAppDataWebhook,
  requestSupplierQuote,
  restoreBackupPreview,
  scheduleMeeting,
  scrapeWebsite,
  searchCustomers,
  sendWhatsAppMessage,
  sendWhatsAppTaskReminder,
  syncManagerFromFireberry,
  syncMeetingToFireberry,
  syncTaskToFireberry,
  toggleClientStatus,
  updateUsersFireberryIds,
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
