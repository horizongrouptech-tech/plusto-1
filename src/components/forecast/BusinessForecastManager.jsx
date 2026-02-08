import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RefreshCw, Plus, Trash2, TrendingUp, DollarSign, BarChart3, Download, Package, AlertCircle, Star, FileText, Wand2, Edit, UserPlus, Users, StarOff, Rocket, ArrowLeft, CheckCircle } from "lucide-react";
import { BusinessForecast } from "@/entities/BusinessForecast";
import { ProductCatalog } from "@/entities/ProductCatalog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie, Legend } from 'recharts';
import Pagination from '@/components/shared/Pagination';
import ReactMarkdown from 'react-markdown';
import { Textarea } from "@/components/ui/textarea";
import StrategicPlanInputForm from './StrategicPlanInputForm';
import { StrategicPlanInput } from '@/entities/StrategicPlanInput';
import { generateBusinessPlanText } from "@/functions/generateBusinessPlanText";
import { exportBusinessPlanToPdf } from "@/functions/exportBusinessPlanToPdf";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProcessStatus } from '@/entities/ProcessStatus';
import ProcessStatusDisplay from '@/components/forecast/ProcessStatusDisplay';
import { Catalog } from "@/entities/Catalog";
import { FileUpload } from "@/entities/FileUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateTax } from './manual/utils/taxCalculator';

const MONTHS = [
  { key: 'jan', label: 'ינו' },
  { key: 'feb', label: 'פבר' },
  { key: 'mar', label: 'מרץ' },
  { key: 'apr', label: 'אפר' },
  { key: 'may', label: 'מאי' },
  { key: 'jun', label: 'יונ' },
  { key: 'jul', label: 'יול' },
  { key: 'aug', label: 'אוג' },
  { key: 'sep', label: 'ספט' },
  { key: 'oct', label: 'אוק' },
  { key: 'nov', label: 'נוב' },
  { key: 'dec', label: 'דצמ' }
];

const JOB_TYPES = [
  { value: 'full_time', label: 'משרה מלאה' },
  { value: 'part_time', label: 'משרה חלקית' },
  { value: 'hourly', label: 'שעתי' },
  { value: 'freelancer', label: 'פרילנסר (פרויקטים)' }
];

const COLORS = {
  profit: '#22c55e',
  loss: '#ef4444',
  neutral: '#3b82f6',
  important: '#eab308',
  secondary: '#6b7280'
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];
const ITEMS_PER_PAGE = 50;

const TooltipComponent = ({ children, content }) => {
    return (
        <ShadcnTooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent className="bg-horizon-card text-horizon-text border-horizon">
                {content}
            </TooltipContent>
        </ShadcnTooltip>
    );
};

const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '₪0';
    return `₪${Math.round(value).toLocaleString()}`;
};

export default function BusinessForecastManager({ customer,selectedForecastId,initialForecastData,onBack}) {  const { toast } = useToast();

  const [forecasts, setForecasts] = useState([]);
  const [forecast, setForecast] = useState(null); // The currently selected/active forecast
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]); // Combined global and planned employees
  const [detailedExpenses, setDetailedExpenses] = useState({ marketing_sales: [], admin_general: [] });
  const [salesForecastData, setSalesForecastData] = useState({ working_days_per_month: 22, monthly_forecasts: [] });

  // ✅ FIX #2: Create Map once for fast lookups across component
  const forecastMap = useMemo(() => {
    const map = new Map();
    (salesForecastData?.monthly_forecasts || []).forEach(entry => {
      map.set(entry.service_name, entry);
    });
    return map;
  }, [salesForecastData?.monthly_forecasts]);

  const servicesMap = useMemo(() => {
    return new Map((services || []).map(s => [s.service_name, s]));
  }, [services]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // For saving individual forecast data
  const [isGenerating, setIsGenerating] = useState(false); // General AI generation state

  const [activeTab, setActiveTab] = useState('summary');

  const [editingForecastName, setEditingForecastName] = useState(false);
  const [forecastNameInput, setForecastNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const [showStrategicInput, setShowStrategicInput] = useState(false);
  const [strategicInputId, setStrategicInputId] = useState(null);
  const [processId, setProcessId] = useState(null);

  const [error, setError] = useState('');
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);

  // Pagination State
  const [productsCurrentPage, setProductsCurrentPage] = useState(1);
  const [salesForecastCurrentPage, setSalesForecastCurrentPage] = useState(1);

  // Business Plan Management
  const [businessPlanText, setBusinessPlanText] = useState("");
  const [showBusinessPlanModal, setShowBusinessPlanModal] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editedPlanText, setEditedPlanText] = useState("");
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // New Forecast Generation Flow
  const [isNewForecastModalOpen, setIsNewForecastModalOpen] = useState(false);
  const [newForecastName, setNewForecastName] = useState("");
  const [newForecastYear, setNewForecastYear] = useState(new Date().getFullYear());
  const [existingStrategicInput, setExistingStrategicInput] = useState(null);
  const [strategicInputForGeneration, setStrategicInputForGeneration] = useState(null);
  const [forecastTypeForGeneration, setForecastTypeForGeneration] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [showNewForecastForm, setShowNewForecastForm] = useState(false);
  const [runningProcess, setRunningProcess] = useState(null);
  const [isCatalogSynced, setIsCatalogSynced] = useState(false);

  const [showFullForecastGeneration, setShowFullForecastGeneration] = useState(false);
  const [forecastToComplete, setForecastToComplete] = useState(null);
  const [pendingForecastType, setPendingForecastType] = useState(null);
  const [showInitialCreationModal, setShowInitialCreationModal] = useState(false);
  const [newForecastNameInput, setNewForecastNameInput] = useState('');
  const [newForecastYearInput, setNewForecastYearInput] = useState(new Date().getFullYear());
  const [selectedCatalogToSync, setSelectedCatalogToSync] = useState(null);
  const [initialForecastDraft, setInitialForecastDraft] = useState(null);
  const [catalogs, setCatalogs] = useState([]);
  const [customerFiles, setCustomerFiles] = useState([]); // לשמירת קבצי הלקוח הזמינים
  const [selectedHistoricalFiles, setSelectedHistoricalFiles] = useState([]); // לשמירת קבצים שנבחרו
  const loadForecast = useCallback((forecastObj) => {
    setForecast(forecastObj);
    setForecastNameInput(forecastObj.forecast_name || '');

    setServices(forecastObj.services_data || []);

    const combinedEmployees = [
      ...(forecastObj.global_employees_data || []).map(emp => ({ ...emp, type: 'global' })),
      ...(forecastObj.planned_employee_hires || []).map(hire => ({ ...hire, type: 'planned' }))
    ];
    setEmployees(combinedEmployees);

    setSalesForecastData(forecastObj.sales_forecast_data || { working_days_per_month: 22, monthly_forecasts: [] });

    setDetailedExpenses(forecastObj.detailed_expenses || { marketing_sales: [], admin_general: [] });

    // ✅ Removed setSummary - now calculated via useMemo

    setBusinessPlanText(forecastObj.business_plan_text || "");
    setEditedPlanText(forecastObj.business_plan_text || "");
    setIsCatalogSynced(forecastObj.services_data?.length > 0 && (forecastObj.is_system_generated || forecastObj.synced_from_catalog));
  }, []);

  const handleSelectForecast = useCallback((forecastObj) => {
    loadForecast(forecastObj);
    setActiveTab('summary');
  }, [loadForecast, setActiveTab]);

  const getLatestStrategicInput = useCallback(async () => {
    if (!customer?.email) return null;
    try {
      const inputs = await StrategicPlanInput.filter({ customer_email: customer.email }, '-created_date', 1);
      if (inputs.length > 0) {
        setStrategicInputId(inputs[0].id);
        return inputs[0];
      }
      return null;
    } catch (err) {
      console.error("Error fetching latest strategic input:", err);
      return null;
    }
  }, [customer?.email, setStrategicInputId]);

  const checkForRunningProcesses = useCallback(async (email) => {
    const runningProcesses = await ProcessStatus.filter({
      customer_email: email,
      status: 'running'
    });
    setProcesses(runningProcesses);
    if (runningProcesses.length > 0) {
        setRunningProcess(runningProcesses[0]);
        setProcessId(runningProcesses[0].id);
    } else {
        setRunningProcess(null);
        setProcessId(null);
    }
  }, [setProcesses, setRunningProcess, setProcessId]);

  const loadCustomerCatalogs = useCallback(async () => {
      if (!customer?.email) return;
      try {
          const fetchedCatalogs = await Catalog.filter({ customer_email: customer.email }, "-created_date");
          setCatalogs(fetchedCatalogs);
      } catch (error) {
          console.error("Error loading customer catalogs:", error);
      }
  }, [customer?.email, setCatalogs]);
  const loadCustomerFiles = useCallback(async () => {
    if (!customer?.email) return;
    try {
        const files = await FileUpload.filter({ customer_email: customer.email }, "-created_date");
        setCustomerFiles(files);
    } catch (error) {
        console.error("Error loading customer files:", error);
        toast({ title: "שגיאה", description: "שגיאה בטעינת קבצי הלקוח.", variant: "destructive" });
    }
  }, [customer?.email, toast]);

  const loadForecastsList = useCallback(async () => {
    if (!customer?.email) return;
    setIsLoading(true);
    try {
      const fetchedForecasts = await BusinessForecast.filter({ customer_email: customer.email }, "-created_date");
      setForecasts(fetchedForecasts);

      if (fetchedForecasts.length > 0) {
        handleSelectForecast(fetchedForecasts[0]);
      } else {
        setForecast(null);
        setServices([]);
        setEmployees([]);
        setDetailedExpenses({ marketing_sales: [], admin_general: [] });
        setSalesForecastData({ working_days_per_month: 22, monthly_forecasts: [] });
        setIsCatalogSynced(false);
      }
    } catch (error) {
      console.error("Error loading forecast data:", error);
      setError("שגיאה בטעינת התוכניות.");
    } finally {
      setIsLoading(false);
    }
  }, [customer?.email, handleSelectForecast]);

  // ✅ FIX #10: Fix dependency hell - only load if actually different
  useEffect(() => {
    if (selectedForecastId && forecasts.length > 0) {
      const forecastToLoad = forecasts.find(f => f.id === selectedForecastId);
      if (forecastToLoad && forecastToLoad.id !== forecast?.id) {
        loadForecast(forecastToLoad);
      }
    } else if (initialForecastData && !selectedForecastId && !forecast && !isLoading) {
      setShowInitialCreationModal(true);
      setNewForecastNameInput(initialForecastData.forecast_name || '');
      setNewForecastYearInput(initialForecastData.forecast_year || new Date().getFullYear());
    }
  }, [selectedForecastId, forecasts, initialForecastData]);
  // ✅ FIX: Only depend on customer.email to prevent infinite loops
  useEffect(() => {
    if (!customer?.email) return;

    loadForecastsList();
    getLatestStrategicInput();
    loadCustomerCatalogs();
    loadCustomerFiles();

    const fetchProcesses = async () => {
      if (customer?.email) {
        const runningProcesses = await ProcessStatus.filter({
          customer_email: customer.email,
          status: 'running'
        });
        setProcesses(runningProcesses);
        setRunningProcess(runningProcesses[0] || null);
        setProcessId(runningProcesses[0]?.id || null);
      }
    };

    fetchProcesses();
    const intervalId = setInterval(fetchProcesses, 30000);

    return () => clearInterval(intervalId);
  }, [customer?.email]);

  const calculateEmployeeCosts = useCallback((currentForecast) => {
    let totalSalaries = 0;
    const monthlyEmployeeCosts = Array(12).fill(0);

    const globalEmployees = employees.filter(emp => emp.type === 'global');
    const plannedHires = employees.filter(emp => emp.type === 'planned');

    (globalEmployees || []).forEach(emp => {
      const salaryAdditionMultiplier = 1 + ((emp.salary_addition_percentage || 25) / 100);
      let baseMonthlyCost = 0;

      if (emp.job_type === 'full_time' || emp.job_type === 'part_time') {
        baseMonthlyCost = emp.base_salary;
      } else if (emp.job_type === 'hourly') {
        baseMonthlyCost = (emp.base_salary * (emp.hours_per_month || 0));
      } else if (emp.job_type === 'freelancer') {
        baseMonthlyCost = (emp.base_salary * (emp.projects_per_month || 0));
      }

      const effectiveMonthlyCost = baseMonthlyCost * salaryAdditionMultiplier;

      for (let month = 1; month <= 12; month++) {
        if (month >= (emp.start_month || 1) && month <= (emp.end_month || 12)) {
          if (!(emp.unpaid_leave_months || []).includes(month)) {
            monthlyEmployeeCosts[month - 1] += effectiveMonthlyCost + (emp.monthly_bonuses?.[month - 1] || 0);
          }
        }
      }
    });

    (plannedHires || []).forEach(hire => {
      for (let month = 1; month <= 12; month++) {
        if (month >= (hire.month_of_hire || 1)) {
          const plannedSalaryAdditionMultiplier = 1 + (25 / 100);
          const effectiveMonthlySalary = (hire.estimated_monthly_salary || 0) * plannedSalaryAdditionMultiplier;
          monthlyEmployeeCosts[month - 1] += (effectiveMonthlySalary * (hire.count || 1)) + (hire.bonus_structure?.[month - 1] || 0);
        }
      }
    });

    totalSalaries = monthlyEmployeeCosts.reduce((sum, cost) => sum + cost, 0);
    return { totalSalaries, monthlyEmployeeCosts };
  }, [employees]);

  const calculateProfitLoss = useCallback((currentForecastObj) => {
    const currentServices = services;
    const currentSalesForecastData = salesForecastData;
    const currentDetailedExpenses = detailedExpenses;
    const currentOtherCosts = currentForecastObj.other_costs || { admin_general: 0, marketing_sales: 0, tax_rate: 23 };

    // ✅ FIX #2: Convert to Map for O(1) lookup instead of O(n) find()
    const servicesMap = new Map((currentServices || []).map(s => [s.service_name, s]));

    const totalRevenue = (currentSalesForecastData?.monthly_forecasts || []).reduce((sum, forecastEntry) => {
      const monthlyQuantity = MONTHS.reduce((monthSum, month) => {
        return monthSum + (forecastEntry[month.key] || 0);
      }, 0);

      const serviceItem = servicesMap.get(forecastEntry.service_name);
      return sum + (monthlyQuantity * (serviceItem?.selling_price || 0));
    }, 0);

    const totalCogs = (currentSalesForecastData?.monthly_forecasts || []).reduce((sum, forecastEntry) => {
      const monthlyQuantity = MONTHS.reduce((monthSum, month) => {
        return monthSum + (forecastEntry[month.key] || 0);
      }, 0);

      const serviceItem = servicesMap.get(forecastEntry.service_name);
      return sum + (monthlyQuantity * (serviceItem?.cost_price || 0));
    }, 0);

    const grossProfit = totalRevenue - totalCogs;

    const { totalSalaries } = calculateEmployeeCosts(currentForecastObj);

    const totalMarketingExpenses = (currentDetailedExpenses?.marketing_sales || []).reduce((sum, item) => sum + (item.amount || 0), 0);

    const totalAdminExpenses = (currentDetailedExpenses?.admin_general || []).reduce((sum, item) => sum + (item.amount || 0), 0);

    const totalExpenses = totalSalaries + totalMarketingExpenses + totalAdminExpenses;

    const operationalProfit = grossProfit - totalExpenses;

    const companyType = currentForecastObj.company_type || 'company'; // ברירת מחדל: חברה בע״מ
    const taxRate = currentOtherCosts.tax_rate !== undefined ? currentOtherCosts.tax_rate : 23;
    const taxAmount = calculateTax(operationalProfit, companyType, taxRate);

    const netProfit = operationalProfit - taxAmount;

    return {
      total_revenue: totalRevenue,
      total_cogs: totalCogs,
      gross_profit: grossProfit,
      total_expenses: totalExpenses,
      operational_profit: operationalProfit,
      tax_amount: taxAmount,
      net_profit: netProfit
    };
  }, [services, salesForecastData, detailedExpenses, calculateEmployeeCosts]);

  const handleSaveField = async (fieldName, value) => {
    if (!forecast || !forecast.is_editable || isSaving) return;
    setIsSaving(true);
    try {
      let updatedForecastData = { ...forecast };

      if (fieldName === 'forecast_name') {
        updatedForecastData.forecast_name = value;
      } else if (fieldName === 'services') {
        updatedForecastData.services_data = value;
      } else if (fieldName === 'employees') {
        updatedForecastData.global_employees_data = value.filter(emp => emp.type === 'global');
        updatedForecastData.planned_employee_hires = value.filter(emp => emp.type === 'planned');
      } else if (fieldName === 'sales_forecast') {
        updatedForecastData.sales_forecast_data = value;
      } else if (fieldName === 'detailed_expenses') {
        updatedForecastData.detailed_expenses = value;
      } else if (fieldName === 'other_costs') {
          updatedForecastData.other_costs = { ...updatedForecastData.other_costs, ...value };
      }

      const recalculatedProfitLoss = calculateProfitLoss(updatedForecastData);
      updatedForecastData.profit_loss_summary = recalculatedProfitLoss;

      const totalMarketingSales = (updatedForecastData.detailed_expenses?.marketing_sales || []).reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalAdminGeneral = (updatedForecastData.detailed_expenses?.admin_general || []).reduce((sum, item) => sum + (item.amount || 0), 0);
      updatedForecastData.other_costs = {
        ...updatedForecastData.other_costs,
        admin_general: totalAdminGeneral,
        marketing_sales: totalMarketingSales,
      };

      const savedForecastResult = await BusinessForecast.update(forecast.id, updatedForecastData);

      setForecasts(prev => prev.map(f => f.id === savedForecastResult.id ? savedForecastResult : f));
      loadForecast(savedForecastResult);

      toast({
        title: "התוכנית נשמרה",
        description: `השינויים ב${fieldName} נשמרו בהצלחה!`,
        variant: "success",
      });
    } catch (error) {
      console.error(`Error saving ${fieldName}:`, error);
      toast({
        title: "שגיאה",
        description: `שגיאה בשמירת ${fieldName}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setEditingForecastName(false);
      setForecastNameInput(forecast.forecast_name || '');
    }
  };

  const handleSyncFromCatalog = async () => {
    if (!customer?.email) {
      toast({ title: "שגיאה", description: "לא נמצא לקוח מחובר.", variant: "destructive" });
      return;
    }
    if (!forecast || !forecast.is_editable) {
        toast({ title: "שגיאה", description: "יש לבחור תחזית ניתנת לעריכה לפני סנכרון מוצרים.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    setIsLoadingCatalogs(true);
    try {
      // ✅ תיקון: טעינה מוגבלת של מוצרים (500 ראשונים) למניעת קפיאה
      // ✅ FIX: Load from specific catalog if selected, otherwise all customer products
      const MAX_PRODUCTS_TO_SYNC = 500;
      let catalogProducts = [];
      
      if (selectedCatalogToSync?.id) {
        // Load from specific catalog only - with limit
        catalogProducts = await ProductCatalog.filter(
          {
            catalog_id: selectedCatalogToSync.id,
            is_active: true
          },
          '-created_date',
          MAX_PRODUCTS_TO_SYNC,
          0
        );
      } else {
        // Load from all catalogs - but check catalog count first
        const customerCatalogs = await Catalog.filter({ customer_email: customer.email });
        
        if (customerCatalogs.length > 3) {
          toast({ 
            title: "בחר קטלוג ספציפי", 
            description: `יש לך ${customerCatalogs.length} קטלוגים. אנא בחר קטלוג ספציפי לסנכרון כדי למנוע עומס.`, 
            variant: "destructive" 
          });
          setIsSaving(false);
          setIsLoadingCatalogs(false);
          return;
        }
        
        // Load all products (safe for <=3 catalogs) - with limit
        catalogProducts = await ProductCatalog.filter(
          {
            customer_email: customer.email,
            is_active: true
          },
          '-created_date',
          MAX_PRODUCTS_TO_SYNC,
          0
        );
      }

      if (catalogProducts.length === 0) {
        toast({ title: "אין מוצרים", description: "לא נמצאו מוצרים פעילים בקטלוג לסנכרון.", variant: "destructive" });
        setIsSaving(false);
        setIsLoadingCatalogs(false);
        return;
      }

      // ✅ התראה אם יש יותר מוצרים
      if (catalogProducts.length === MAX_PRODUCTS_TO_SYNC) {
        const totalCount = await ProductCatalog.count({
          customer_email: customer.email,
          is_active: true
        });
        if (totalCount > MAX_PRODUCTS_TO_SYNC) {
          toast({ 
            title: "התראה", 
            description: `נטענו ${MAX_PRODUCTS_TO_SYNC} מוצרים מתוך ${totalCount} קיימים. מומלץ לסנן לפי קטלוג ספציפי.`, 
            variant: "default" 
          });
        }
      }

      const servicesData = catalogProducts.map(p => ({
        service_name: p.product_name || 'ללא שם',
        cost_price: p.cost_price || 0,
        selling_price: p.selling_price || 0,
        category: p.category || 'כללי',
        supplier: p.supplier || 'לא צוין',
        gross_margin_percentage: p.profit_percentage || 0
      }));

      const updatedForecast = await BusinessForecast.update(forecast.id, {
        services_data: servicesData,
        synced_from_catalog: true,
      });

      setForecasts(prev => prev.map(f => f.id === updatedForecast.id ? updatedForecast : f));
      loadForecast(updatedForecast);
      setIsCatalogSynced(true);

      toast({ title: "מוצרים סונכרנו!", description: `${catalogProducts.length} מוצרים סונכרנו לתחזית הנוכחית.` });

    } catch (error) {
      console.error("Error syncing catalog:", error);
      toast({ title: "שגיאה בסנכרון", description: error.message || "אירעה שגיאה בסנכרון המוצרים מהקטלוג.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setIsLoadingCatalogs(false);
    }
  };


  const addService = () => {
    if (!forecast?.is_editable) return;
    const newService = {
        service_name: '',
        cost_price: 0,
        selling_price: 0,
        category: '',
        supplier: '',
        gross_margin_percentage: 0
    };
    const updatedServices = [...services, newService];
    setServices(updatedServices);
    handleSaveField('services', updatedServices);
    setProductsCurrentPage(1);
    setIsCatalogSynced(false);
  };
  const handleInitialForecastDetailsSubmit = async () => {
    if (!newForecastNameInput.trim() || !selectedCatalogToSync) {
        toast({ title: "שגיאה", description: "אנא מלא את שם התוכנית ובחר קטלוג לסנכרון.", variant: "destructive" });
        return;
    }
    if (catalogs.length === 0) {
         toast({ title: "שגיאה", description: "לא נמצאו קטלוגים במערכת. אנא צור קטלוג חדש או העלה מוצרים לקטלוג קיים תחילה.", variant: "destructive" });
        return;
    }

    setIsGenerating(true);
    setIsLoadingCatalogs(true);
    toast({ title: "מכין תוכנית...", description: "מסנכרן מוצרים מהקטלוג הנבחר.", variant: "default" });

    try {
        // ✅ תיקון: טעינה מוגבלת של מוצרים (500 ראשונים) למניעת קפיאה
        // ✅ FIX: Add retry logic for rate limiting
        const MAX_PRODUCTS_TO_SYNC = 500;
        let productsToSync = [];
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            productsToSync = await ProductCatalog.filter(
              {
                catalog_id: selectedCatalogToSync.id,
                is_active: true
              },
              '-created_date',
              MAX_PRODUCTS_TO_SYNC,
              0
            );
            break; // Success - exit retry loop
          } catch (error) {
            if (error.message?.includes('Rate limit') && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Wait 2s, 4s, 6s
              continue;
            }
            throw error; // Re-throw if not rate limit or max retries reached
          }
        }

        if (productsToSync.length === 0) {
            toast({ title: "אין מוצרים בקטלוג", description: `הקטלוג שבחרת (${selectedCatalogToSync.catalog_name}) ריק ממוצרים פעילים. אנא העלה מוצרים או בחר קטלוג אחר.`, variant: "destructive" });
            setIsGenerating(false);
            setIsLoadingCatalogs(false);
            return;
        }

        // ✅ התראה אם יש יותר מוצרים
        if (productsToSync.length === MAX_PRODUCTS_TO_SYNC) {
          const totalCount = await ProductCatalog.count({
            catalog_id: selectedCatalogToSync.id,
            is_active: true
          });
          if (totalCount > MAX_PRODUCTS_TO_SYNC) {
            toast({ 
              title: "התראה", 
              description: `נטענו ${MAX_PRODUCTS_TO_SYNC} מוצרים מתוך ${totalCount} קיימים בקטלוג.`, 
              variant: "default" 
            });
          }
        }

        const servicesData = productsToSync.map(p => ({
            service_name: p.product_name || 'ללא שם',
            cost_price: p.cost_price || 0,
            selling_price: p.selling_price || 0,
            category: p.category || 'כללי',
            supplier: p.supplier || 'לא צוין',
            gross_margin_percentage: p.profit_percentage || 0
        }));

        const draft = {
            customer_email: customer.email,
            forecast_name: newForecastNameInput,
            forecast_year: newForecastYearInput,
            services_data: servicesData,
            global_employees_data: [],
            planned_employee_hires: [],
            sales_forecast_data: { working_days_per_month: 22, monthly_forecasts: [] },
            detailed_expenses: { marketing_sales: [], admin_general: [] },
            other_costs: { admin_general: 0, marketing_sales: 0, tax_rate: 23 },
            company_type: 'company', // ברירת מחדל: חברה בע״מ            profit_loss_summary: null,
            is_editable: true,
            is_system_generated: false,
            version_name: 'v1.0',
            rating: 0
        };
        setInitialForecastDraft(draft);

        setShowInitialCreationModal(false);
        setShowStrategicInput(true);

        const latestInputs = await getLatestStrategicInput();
        if (latestInputs) {
            setExistingStrategicInput(latestInputs);
        } else {
            setExistingStrategicInput(null);
        }

        toast({ title: "מוכן למילוי שאלון!", description: "אנא השלם את השאלון האסטרטגי להשלמת התוכנית.", variant: "success" });

    } catch (error) {
        console.error("Error in initial forecast details submission:", error);
        toast({ title: "שגיאה", description: `אירעה שגיאה: ${error.message}. נסה שוב.`, variant: "destructive" });
    } finally {
        setIsGenerating(false);
        setIsLoadingCatalogs(false);
    }
  };
  const handleServiceChange = (index, field, value) => {
    if (!forecast?.is_editable) return;
    const updatedServices = [...services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    const service = updatedServices[index];
    const sellingPriceNum = parseFloat(service.selling_price);
    const costPriceNum = parseFloat(service.cost_price);
    const grossMargin = costPriceNum > 0 ? ((sellingPriceNum - costPriceNum) / costPriceNum) * 100 : 0;
    updatedServices[index].gross_margin_percentage = grossMargin;
    setServices(updatedServices);
    setIsCatalogSynced(false);
  };

  const removeService = (index) => {
    if (!forecast?.is_editable) return;
    const updatedServices = services.filter((_, i) => i !== index);
    setServices(updatedServices);
    handleSaveField('services', updatedServices);
    setIsCatalogSynced(false);
  };

  const addGlobalEmployee = () => {
    if (!forecast?.is_editable) return;
    const newEmployee = {
      type: 'global',
      employee_role: '',
      job_type: 'full_time',
      base_salary: 0,
      salary_addition_percentage: 25,
      hours_per_month: 0,
      projects_per_month: 0,
      monthly_total_cost: 0,
      start_month: 1,
      end_month: 12,
      monthly_bonuses: Array(12).fill(0),
      unpaid_leave_months: []
    };
    const updatedEmployees = [...employees, newEmployee];
    setEmployees(updatedEmployees);
    handleSaveField('employees', updatedEmployees);
  };

  const addPlannedHire = () => {
    if (!forecast?.is_editable) return;
    const newHire = {
      type: 'planned',
      role: '',
      count: 1,
      month_of_hire: 1,
      estimated_monthly_salary: 0,
      bonus_structure: Array(12).fill(0)
    };
    const updatedEmployees = [...employees, newHire];
    setEmployees(updatedEmployees);
    handleSaveField('employees', updatedEmployees);
  };

  const removeEmployee = (index) => {
    if (!forecast?.is_editable) return;
    const updatedEmployees = employees.filter((_, i) => i !== index);
    setEmployees(updatedEmployees);
    handleSaveField('employees', updatedEmployees);
  };

  const handleEmployeeChange = (index, field, value) => {
    if (!forecast?.is_editable) return;
    const updatedEmployees = [...employees];
    updatedEmployees[index][field] = value;

    const emp = updatedEmployees[index];
    if (emp.type === 'global') {
        const salaryAdditionMultiplier = 1 + ((emp.salary_addition_percentage || 25) / 100);
        let monthlyCost = 0;

        if (emp.job_type === 'full_time' || emp.job_type === 'part_time') {
            monthlyCost = (emp.base_salary || 0) * salaryAdditionMultiplier;
        } else if (emp.job_type === 'hourly') {
            monthlyCost = (emp.base_salary || 0) * (emp.hours_per_month || 0) * salaryAdditionMultiplier;
        } else if (emp.job_type === 'freelancer') {
            monthlyCost = (emp.base_salary || 0) * (emp.projects_per_month || 0) * salaryAdditionMultiplier;
        }
        updatedEmployees[index].monthly_total_cost = monthlyCost;
    }
    setEmployees(updatedEmployees);
  };

  const handleEmployeeBonusChange = (empIndex, monthIndex, value) => {
    if (!forecast?.is_editable) return;
    const updatedEmployees = [...employees];
    const employee = updatedEmployees[empIndex];

    if (employee.type === 'global') {
      const newBonuses = [...(employee.monthly_bonuses || Array(12).fill(0))];
      newBonuses[monthIndex] = parseFloat(value) || 0;
      employee.monthly_bonuses = newBonuses;
    } else if (employee.type === 'planned') {
      const newBonuses = [...(employee.bonus_structure || Array(12).fill(0))];
      newBonuses[monthIndex] = parseFloat(value) || 0;
      employee.bonus_structure = newBonuses;
    }
    setEmployees(updatedEmployees);
  };

  const handleEmployeeUnpaidLeaveChange = (empIndex, month, isChecked) => {
    if (!forecast?.is_editable) return;
    const updatedEmployees = [...employees];
    const employee = updatedEmployees[empIndex];

    if (employee.type === 'global') {
      let newUnpaidLeaveMonths = [...(employee.unpaid_leave_months || [])];
      if (isChecked) {
        newUnpaidLeaveMonths = [...newUnpaidLeaveMonths, month];
      } else {
        newUnpaidLeaveMonths = newUnpaidLeaveMonths.filter(m => m !== month);
      }
      employee.unpaid_leave_months = newUnpaidLeaveMonths;
    }
    setEmployees(updatedEmployees);
  };

  const addDetailedExpense = (type) => {
    if (!forecast?.is_editable) return;
    const newExpense = { name: '', amount: 0, monthly_amounts: Array(12).fill(0), is_annual_total: false };
    const updatedExpenses = {
      ...detailedExpenses,
      [type]: [...detailedExpenses[type], newExpense]
    };
    setDetailedExpenses(updatedExpenses);
    handleSaveField('detailed_expenses', updatedExpenses);
  };

  const removeDetailedExpense = (type, index) => {
    if (!forecast?.is_editable) return;
    const updatedExpenses = {
      ...detailedExpenses,
      [type]: detailedExpenses[type].filter((_, i) => i !== index)
    };
    setDetailedExpenses(updatedExpenses);
    handleSaveField('detailed_expenses', updatedExpenses);
  };

  const handleDetailedExpenseChange = (type, index, field, value) => {
    if (!forecast?.is_editable) return;
    const updatedExpenses = { ...detailedExpenses };
    const expensesArray = [...updatedExpenses[type]];

    expensesArray[index][field] = value;
    if (field === 'amount' && expensesArray[index].is_annual_total) {
        const monthlyVal = (parseFloat(value) || 0) / 12;
        expensesArray[index].monthly_amounts = Array(12).fill(monthlyVal);
    }
    updatedExpenses[type] = expensesArray;
    setDetailedExpenses(updatedExpenses);
  };

  const handleMonthlyExpenseChange = (type, expenseIndex, monthIndex, value) => {
    if (!forecast?.is_editable) return;
    const updatedExpenses = { ...detailedExpenses };
    const expensesArray = [...updatedExpenses[type]];
    const newMonthlyAmounts = [...(expensesArray[expenseIndex].monthly_amounts || Array(12).fill(0))];
    newMonthlyAmounts[monthIndex] = parseFloat(value) || 0;

    expensesArray[expenseIndex].monthly_amounts = newMonthlyAmounts;
    expensesArray[expenseIndex].amount = newMonthlyAmounts.reduce((s, c) => s + (Number(c) || 0), 0);

    updatedExpenses[type] = expensesArray;
    setDetailedExpenses(updatedExpenses);
  };

  // ✅ FIX #1: Replace useEffect + useCallback with useMemo to prevent infinite loops
  const summary = useMemo(() => {
    if (!forecast) return null;
    return calculateProfitLoss(forecast);
  }, [forecast, calculateProfitLoss]);


  // ✅ FIX #4: Memoize chart data generation
  const salesChartData = useMemo(() => {
    if (!forecast) return [];
    const serviceMap = new Map((services || []).map(s => [s.service_name, s]));
    
    return MONTHS.map(month => {
      const monthlyRevenue = (salesForecastData?.monthly_forecasts || []).reduce((sum, forecastEntry) => {
        const quantity = forecastEntry[month.key] || 0;
        const service = serviceMap.get(forecastEntry.service_name);
        return sum + (quantity * (service?.selling_price || 0));
      }, 0);

      return {
        month: month.label,
        revenue: monthlyRevenue,
      };
    });
  }, [forecast, salesForecastData.monthly_forecasts, services]);

  const expensesPieData = useMemo(() => {
    if (!summary) return [];
    const { totalSalaries } = calculateEmployeeCosts(forecast);

    const marketing = (detailedExpenses?.marketing_sales || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    const admin = (detailedExpenses?.admin_general || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    const cogs = summary.total_cogs || 0;

    const data = [
      { name: 'עלות גלם', value: cogs, color: COLORS.important },
      { name: 'שכר עובדים', value: totalSalaries, color: COLORS.neutral },
      { name: 'מכירות ושיווק', value: marketing, color: COLORS.profit },
      { name: 'הנהלה וכלליות', value: admin, color: COLORS.loss }
    ].filter(item => item.value > 0);

    if (data.length === 0) {
      return [{ name: 'אין הוצאות', value: 1, color: COLORS.secondary }];
    }
    return data;
  }, [summary, forecast, detailedExpenses, calculateEmployeeCosts]);

  const profitabilityData = useMemo(() => {
    if (!forecast) return [];
    const { monthlyEmployeeCosts } = calculateEmployeeCosts(forecast);
    const serviceMap = new Map((services || []).map(s => [s.service_name, s]));

    return MONTHS.map((month, monthIndex) => {
      const monthlyRevenue = (salesForecastData?.monthly_forecasts || []).reduce((sum, forecastEntry) => {
        const quantity = forecastEntry[month.key] || 0;
        const service = serviceMap.get(forecastEntry.service_name);
        return sum + (quantity * (service?.selling_price || 0));
      }, 0);

      const monthlyCogs = (salesForecastData?.monthly_forecasts || []).reduce((sum, forecastEntry) => {
        const quantity = forecastEntry[month.key] || 0;
        const service = serviceMap.get(forecastEntry.service_name);
        return sum + (quantity * (service?.cost_price || 0));
      }, 0);

      const monthlySalaries = monthlyEmployeeCosts[monthIndex];
      const monthlyMarketing = (detailedExpenses?.marketing_sales || []).reduce((sum, item) => sum + (item.monthly_amounts?.[monthIndex] || 0), 0);
      const monthlyAdmin = (detailedExpenses?.admin_general || []).reduce((sum, item) => sum + (item.monthly_amounts?.[monthIndex] || 0), 0);

      const monthlyTotalOperationalExpenses = monthlySalaries + monthlyMarketing + monthlyAdmin;

      const monthlyProfit = monthlyRevenue - monthlyCogs - monthlyTotalOperationalExpenses;
      const profitPercentage = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

      return {
        month: month.label,
        profitPercentage: profitPercentage,
        profit: monthlyProfit
      };
    });
  }, [forecast, salesForecastData.monthly_forecasts, services, detailedExpenses, calculateEmployeeCosts]);

  const generateForecastVersion = async (forecastType) => {
    if (!forecast) {
      toast({ title: "שגיאה", description: "יש לבחור תחזית קיימת כדי ליצור גרסה חדשה שלה.", variant: "destructive" });
      return;
    }
    if (!forecast.is_editable) {
      toast({ title: "שגיאה", description: "לא ניתן ליצור תחזית חדשה מתוך תוכנית שאינה ניתנת לעריכה.", variant: "destructive" });
      return;
    }

    if (!forecast.services_data || forecast.services_data.length === 0) {
      toast({
        title: "אין מוצרים בתחזית",
        description: "כדי ליצור תחזית AI, יש לסנכרן מוצרים מהקטלוג או להוסיף אותם ידנית לתוכנית זו.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    toast({ title: "יוצר תחזית חדשה...", description: "תהליך יצירת התחזית החל ברקע. תקבל עדכון בסיומו.", variant: "default" });
    try {
      const latestStrategicInput = await getLatestStrategicInput();

      const { data: response } = await base44.functions.invoke('orchestrateBusinessForecast', {
          customer_email: customer.email,
          forecast_name: `${forecast.forecast_name} - ${forecastType === 'optimistic' ? 'אופטימית' : 'שמרנית'}`,
          forecast_year: forecast.forecast_year,
          forecastType: forecastType,
          strategicInput: latestStrategicInput,
          services_data: forecast.services_data,
      });

      console.log('orchestrateBusinessForecast response:', response);

      if (response?.success === true) {
        toast({ title: "התחזית בהכנה", description: "תהליך יצירת התחזית החל ברקע. תקבל עדכון בסיומו.", variant: "default", });
        await checkForRunningProcesses(customer.email);
      } else {
        throw new Error(response?.error || 'שגיאה ביצירת תחזית - אנא נסה שוב');
      }
    } catch (error) {
      console.error(`Error generating ${forecastType} forecast:`, error);
      toast({ title: "שגיאה ביצירת תחזית", description: error.message || "אירעה שגיאה בלתי צפויה. נסה שוב.", variant: "destructive", });
    } finally {
      setIsGenerating(false);
    }
  };


  const handleSalesForecastChange = (serviceName, monthKey, value) => {
    if (!forecast?.is_editable) return;
    const updatedMonthlyForecasts = [...(salesForecastData.monthly_forecasts || [])];
    const existingIndex = updatedMonthlyForecasts.findIndex(f => f.service_name === serviceName);

    if (existingIndex >= 0) {
      updatedMonthlyForecasts[existingIndex] = {
        ...updatedMonthlyForecasts[existingIndex],
        [monthKey]: parseFloat(value) || 0
      };
    } else {
      updatedMonthlyForecasts.push({
        service_name: serviceName,
        ...MONTHS.reduce((acc, m) => ({ ...acc, [m.key]: m.key === monthKey ? (parseFloat(value) || 0) : 0 }), {})
      });
    }

    const updatedSalesForecastData = { ...salesForecastData, monthly_forecasts: updatedMonthlyForecasts };
    setSalesForecastData(updatedSalesForecastData);
  };

  const exportToExcel = () => {
    if (!forecast || !salesForecastData.monthly_forecasts.length) return;

    const salesForecastHeaders = [
      'שם מוצר/שירות',
      ...MONTHS.map(m => m.label),
      'סה״כ שנתי יחידות',
      'סה״כ שנתי הכנסות'
    ];

    const salesForecastRows = salesForecastData.monthly_forecasts.map(sf => {
      // חישוב סה"כ יחידות שנתי
      const totalYearlyUnits = MONTHS.reduce((sum, m) => sum + (sf[m.key] || 0), 0);

      // מציאת השירות המתאים לחישוב הכנסות
      const currentService = services.find(s => s.service_name === sf.service_name);
      const totalYearlyRevenue = totalYearlyUnits * (currentService?.selling_price || 0);

      return [
        sf.service_name,
        ...MONTHS.map(m => sf[m.key] || 0), // נתוני החודשים
        totalYearlyUnits,      // סה"כ שנתי יחידות
        Math.round(totalYearlyRevenue)     // סה"כ שנתי הכנסות
      ];
    });

    const csvContent = [
      salesForecastHeaders.join(','),
      ...salesForecastRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `תחזית_מכירות_${forecast.forecast_name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRatingChange = async (forecastToUpdate, rating) => {
    try {
      const updatedForecast = await BusinessForecast.update(forecastToUpdate.id, {
        rating: rating,
        last_rated: new Date().toISOString()
      });

      setForecasts(prev => prev.map(f => f.id === forecastToUpdate.id ? updatedForecast : f));

      if (forecast && forecast.id === forecastToUpdate.id) {
        loadForecast(updatedForecast);
      }

      toast({ title: "הדירוג נשמר", description: `התחזית דורגה ב-${rating} כוכבים!`, variant: "success", });
    } catch (error) {
      console.error("Error rating forecast:", error);
      toast({ title: "שגיאה", description: "שגיאה בדירוג התחזית", variant: "destructive", });
    }
  };

  const handleDeleteForecast = async (forecastId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את התחזית?")) return;

    try {
      await BusinessForecast.delete(forecastId);
      await loadForecastsList();

      if (forecast?.id === forecastId) {
        resetCurrentForecastState();
      }

      toast({ title: "נמחק בהצלחה", description: "התחזית נמקה בהצלחה", variant: "success", });
    } catch (error) {
      console.error("Error deleting forecast:", error);
      toast({ title: "שגיאה", description: "שגיאה במחיקת התחזית", variant: "destructive", });
    }
  };

  const generatePdfReport = async () => {
    if (!forecast || !forecast.business_plan_text) return;

    try {
      setIsGenerating(true);

      const response = await exportBusinessPlanToPdf({
          forecast_data: forecast,
          business_name: customer.business_name || customer.full_name || customer.email,
          forecast_name: forecast.forecast_name,
          business_plan_text: forecast.business_plan_text
      });

      if (response.data) {
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `תוכנית_עסקית_${forecast.forecast_name ? forecast.forecast_name.replace(/ /g, '_') : 'תחזית'}.pdf`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/);
            if (filenameMatch && filenameMatch[1]) {
                try {
                    filename = decodeURIComponent(filenameMatch[1].replace(/\+/g, ' '));
                } catch (e) {
                    console.warn("Failed to decode filename, using raw:", filenameMatch[1]);
                    filename = filenameMatch[1];
                }
                if (filename.startsWith('"') && filename.endsWith('"')) {
                    filename = filename.slice(1, -1);
                }
            }
        }

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast({ title: "קובץ ה-PDF נוצר והורד בהצלחה!", description: `קובץ "${filename}" הורד בהצלחה.` });
      } else {
        throw new Error("לא התקבל קובץ PDF תקין מהשרת.");
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setError(`שגיאה בייצוא התוכנית ל-PDF: ${error.message}`);
      toast({ title: "שגיאה בייצוא PDF", description: `שגיאה בייצוא התוכנית ל-PDF: ${error.message}`, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const validateForecastData = useCallback(() => {
    if (!forecast || !summary) return [];
    const warnings = [];

    if (services.length === 0) {
      warnings.push("לא הוספו מוצרים או שירותים");
    }

    const lowProfitProducts = (services || []).filter(s => {
      const forecastEntry = (salesForecastData.monthly_forecasts || []).find(f => f.service_name === s.service_name);
      if (!forecastEntry) return false;

      const totalQuantity = MONTHS.reduce((sum, month) => {
        const monthlyQuantity = forecastEntry[month.key];
        return sum + (typeof monthlyQuantity === 'number' ? monthlyQuantity : 0);
      }, 0);

      if (totalQuantity === 0) return false;

      const totalRevenue = totalQuantity * s.selling_price;
      const totalCost = totalQuantity * s.cost_price;

      if (totalCost === 0) return false;

      const actualGrossMarginPercentage = ((totalRevenue - totalCost) / totalCost) * 100;
      return actualGrossMarginPercentage < 10;
    });

    if (lowProfitProducts.length > 0) {
      warnings.push(`${lowProfitProducts.length} מוצרים עם רווחיות נמוכה מ-10% (בהתבסס על תחזית מכירות)`);
    }

    const totalExpenses = summary.total_expenses || 0;
    const totalRevenue = summary.total_revenue || 0;
    if (totalRevenue > 0 && (totalExpenses / totalRevenue) > 0.8) {
      warnings.push("הוצאות תפעוליות גבוהות מ-80% מההכנסות");
    }

    const globalEmployeesCount = employees.filter(e => e.type === 'global').length;
    const plannedHiresCount = employees.filter(e => e.type === 'planned').length;
    if (globalEmployeesCount === 0 && plannedHiresCount === 0) {
      warnings.push("לא הוספו עובדים - האם זה עסק חד-אישי?");
    }

    const totalForecastedUnits = (salesForecastData.monthly_forecasts || []).reduce((sum, forecastEntry) =>
      sum + MONTHS.reduce((monthSum, month) => {
        const monthlyQuantity = forecastEntry[month.key];
        return monthSum + (typeof monthlyQuantity === 'number' ? monthlyQuantity : 0);
      }, 0), 0
    );
    if (totalForecastedUnits === 0 && services.length > 0) {
      warnings.push("לא הוזנו יחידות בתחזית המכירות");
    }

    if (summary.net_profit < 0) {
      warnings.push("התחזית מצביעה על רווח נקי שלילי");
    }

    return warnings;
  }, [forecast, summary, services, salesForecastData, employees]);

  const warnings = useMemo(() => validateForecastData(), [validateForecastData]);

  const handleShowBusinessPlan = (forecastToShow) => {
    setForecast(forecastToShow);
    setBusinessPlanText(forecastToShow.business_plan_text || "");
    setEditedPlanText(forecastToShow.business_plan_text || "");
    setIsEditingPlan(false);
    setShowBusinessPlanModal(true);
  };

  const handleGenerateBusinessPlan = async (forecastToGenerateFor) => {
    setIsGenerating(true);
    try {
      const latestStrategicInput = await getLatestStrategicInput();

      if (!latestStrategicInput) {
        toast({ title: "שגיאה", description: "לא נמצאו נתונים אסטרטגיים. אנא הזן נתונים אסטרטגיים לפני יצירת תוכנית במלל.", variant: "destructive" });
        setShowStrategicInput(true);
        setForecast(forecastToGenerateFor);
        return;
      }

      const { data: responseData, error: apiError } = await generateBusinessPlanText({
        forecast: forecastToGenerateFor,
        forecastId: forecastToGenerateFor.id,
        customerData: customer,
        strategicInput: latestStrategicInput,
        onlyBusinessPlanText: true
      });

      if (apiError || !responseData.success) {
        throw new Error(apiError?.message || responseData.error || 'שגיאה ביצירת התוכנית במלל.');
      }

      const generatedText = responseData.business_plan_text;
      setBusinessPlanText(generatedText);
      setEditedPlanText(generatedText);

      const updatedForecast = { ...forecastToGenerateFor, business_plan_text: generatedText };
      setForecasts(prevForecasts => prevForecasts.map(f =>
        f.id === forecastToGenerateFor.id ? updatedForecast : f
      ));
      setForecast(updatedForecast);

      setShowBusinessPlanModal(true);
      toast({ title: "תוכנית עסקית נוצרה!", description: "תוכנית במלל נוצרה בהצלחה.", variant: "success", });
    } catch (error) {
      console.error("Error generating business plan:", error);
      toast({ title: "שגיאה ביצירת תוכנית עסקית", description: error.message || "אירעה שגיאה בלתי צפויה. נסה שוב.", variant: "destructive", });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStrategicInputSubmit = async (strategicInputData) => {
    setShowStrategicInput(false);

    try {
      let strategicPlanInputRecord;
      if (existingStrategicInput) {
        strategicPlanInputRecord = await StrategicPlanInput.update(existingStrategicInput.id, {
          ...strategicInputData,
          customer_email: customer.email,
          selected_forecast_type: pendingForecastType,
        });
        strategicPlanInputRecord.id = existingStrategicInput.id;
      } else {
        strategicPlanInputRecord = await StrategicPlanInput.create({
          ...strategicInputData,
          customer_email: customer.email,
          selected_forecast_type: pendingForecastType,
        });
      }
      setExistingStrategicInput(strategicPlanInputRecord);
      setStrategicInputId(strategicPlanInputRecord.id);
      // אם יש draft אבל אין forecast type, נגדיר אותו אוטומטית
      if (initialForecastDraft && !pendingForecastType) {
        setPendingForecastType('optimistic'); // ברירת מחדל לתחזית אופטימית
      }

      if (initialForecastDraft) {
        // נגדיר forecast type אוטומטית אם לא קיים
        const forecastType = pendingForecastType || 'optimistic';
        
        await initiateNewForecastGeneration(
            {
                name: initialForecastDraft.forecast_name,
                year: initialForecastDraft.forecast_year,
                type: forecastType,
                services_data: initialForecastDraft.services_data
            },
            strategicPlanInputRecord
        );
        setInitialForecastDraft(null);
      } else if (forecast && pendingForecastType) {
        await generateForecastVersion(pendingForecastType);
      } else if (forecast && forecast.id && !businessPlanText) {
        await handleGenerateBusinessPlan(forecast);
      } else {
        toast({ title: "הנתונים נשמרו", description: "הנתונים האסטרטגיים נשמרו בהצלחה.", variant: "success" });
      }

    } catch (error) {
      console.error("Error submitting strategic input:", error);
      toast({ title: "שגיאה", description: "שגיאה בשמירת נתונים אסטרטגיים.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setPendingForecastType(null);
    }
  };


  const handleSavePlan = async () => {
    if (!forecast) return;
    setIsSavingPlan(true);
    try {
      const updatedForecast = await BusinessForecast.update(forecast.id, { business_plan_text: editedPlanText });
      setBusinessPlanText(editedPlanText);
      setForecasts(forecasts.map(f => f.id === forecast.id ? updatedForecast : f));
      setForecast(updatedForecast);
      setIsEditingPlan(false);
      toast({ title: "התוכנית נשמרה", description: "התוכנית נשמרה בהצלחה!", variant: "success", });
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({ title: "שגיאה", description: "שגיאה בשמירת התוכנית.", variant: "destructive", });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const generateTextPlan = async () => {
    if (!forecast) return;

    setIsGenerating(true);
    setError('');
    try {
        const { data: result } = await generateBusinessPlanText({ forecastId: forecast.id });
        if (result.success) {
            const updatedForecast = await BusinessForecast.get(forecast.id);
            setForecast(updatedForecast);
            setForecasts(prev => prev.map(f => f.id === updatedForecast.id ? updatedForecast : f));
            setBusinessPlanText(updatedForecast.business_plan_text || "");
            setEditedPlanText(updatedForecast.business_plan_text || "");
            toast({ title: "התוכנית במלל נוצרה!", description: "המלל נוסף לתחזית הנוכחית.", variant: "success", });
        } else {
            throw new Error(result.error || "שגיאה ביצירת המלל");
        }
    } catch (err) {
        console.error('Error generating business plan text:', err);
        setError(err.message);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleInitiateFullForecastGeneration = async (forecastToUse) => {
    if (!forecastToUse.services_data || forecastToUse.services_data.length === 0) {
      toast({ title: "אין מוצרים", description: "יש לסנכרן מוצרים מהקטלוג תחילה.", variant: "destructive" });
      return;
    }
    if (!forecastToUse.is_editable) {
      toast({ title: "שגיאה", description: "לא ניתן ליצור תוכנית מלאה עבור תוכנית שאינה ניתנת לעריכה.", variant: "destructive" });
      return;
    }

    try {
      const latestInputs = await getLatestStrategicInput();
      if (latestInputs) {
        setExistingStrategicInput(latestInputs);
      } else {
        setExistingStrategicInput(null);
      }
    } catch (error) {
      console.error("Failed to load existing strategic input:", error);
      setExistingStrategicInput(null);
    }

    setForecastToComplete(forecastToUse);
    setShowFullForecastGeneration(true);
  };

  const handleFullForecastTypeSelection = (type) => {
    setPendingForecastType(type);
    setShowFullForecastGeneration(false);
    setShowStrategicInput(true);
  };

  const initiateNewForecastGeneration = async (forecastDetails, strategicInputData) => {
    setIsGenerating(true);
    setError('');

    try {
      let strategicPlanInputToUse = strategicInputData;
      if (!strategicPlanInputToUse) {
          strategicPlanInputToUse = await getLatestStrategicInput();
      }

      // ===== שינוי קריטי: העברת strategicInput עצמו ולא רק ה-ID =====
      const forecastPayload = {
        customer_email: customer.email,
        forecast_name: forecastDetails.name,
        forecast_year: forecastDetails.year,
        forecastType: forecastDetails.type,
        strategicInput: strategicPlanInputToUse,  // <--- שינוי: העברת האובייקט המלא במקום רק ID
        services_data: forecastDetails.services_data,
        selected_historical_file_ids: selectedHistoricalFiles,
      };

      const { data: response } = await base44.functions.invoke('orchestrateBusinessForecast', forecastPayload); 

      console.log('orchestrateBusinessForecast response:', response);

      if (response?.success === true) {
        toast({
          title: "התחזית בהכנה",
          description: "תהליך יצירת התחזית החל ברקע. תקבל עדכון בסיומו.",
          variant: "default",
        });
        setShowInitialCreationModal(false);
        setShowStrategicInput(false);
        setIsNewForecastModalOpen(false);
        setNewForecastName("");
        setNewForecastYear(new Date().getFullYear());
        setStrategicInputForGeneration(null);
        setForecastTypeForGeneration(null);
        setInitialForecastDraft(null);
        await checkForRunningProcesses(customer.email);
      } else {
        throw new Error(response?.error || 'שגיאה ביצירת תחזית - אנא נסה שוב');
      }

    } catch (err) {
      console.error('Error initiating forecast generation:', err);
      setError(err.message || 'שגיאה ביצירת התחזית. אנא נסה שוב.');
      toast({
        title: "שגיאה ביצירת תחזית",
        description: err.message || "אירעה שגיאה בלתי צפויה. נסה שוב.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelFullGeneration = () => {
    setShowFullForecastGeneration(false);
    setShowStrategicInput(false);
    setForecastToComplete(null);
    setPendingForecastType(null);
    setExistingStrategicInput(null);
    setInitialForecastDraft(null);
  };

  const resetCurrentForecastState = () => {
    setForecast(null);
    setServices([]);
    setEmployees([]);
    setSalesForecastData({ working_days_per_month: 22, monthly_forecasts: [] });
    setDetailedExpenses({ marketing_sales: [], admin_general: [] });
    setBusinessPlanText("");
    setEditedPlanText("");
    setIsCatalogSynced(false);
  };

  useEffect(() => {
    if (runningProcess && runningProcess.status === 'completed' && runningProcess.result_data) {
        toast({
            title: "טיוטת התחזית מוכנה!",
            description: "התחזית החדשה נטענה לעריכה.",
            variant: "success",
        });
        const newForecast = runningProcess.result_data;
        setForecasts(prev => [newForecast, ...prev]);
        handleSelectForecast(newForecast);
        setRunningProcess(null);
        setProcessId(null);
    } else if (runningProcess && runningProcess.status === 'failed') {
        toast({
            title: "יצירת תחזית נכשלה",
            description: `אירעה שגיאה: ${runningProcess.error_message || 'שגיאה בלתי ידועה'}.`,
            variant: "destructive",
        });
        setRunningProcess(null);
        setProcessId(null);
    }
 }, [runningProcess, toast, handleSelectForecast]);

  // Pagination State
  const totalProductPages = Math.ceil(services.length / ITEMS_PER_PAGE);
  const paginatedServices = services.slice(
    (productsCurrentPage - 1) * ITEMS_PER_PAGE,
    productsCurrentPage * ITEMS_PER_PAGE
  );

  const paginatedServicesForSales = services.slice(
    (salesForecastCurrentPage - 1) * ITEMS_PER_PAGE,
    salesForecastCurrentPage * ITEMS_PER_PAGE
  );
  const totalSalesPages = Math.ceil(services.length / ITEMS_PER_PAGE);


  const renderMonthlyInputs = (expenseType, expenseIndex, currentMonthlyAmounts, disabled = false) => {
    return (
      <>
        <p className="text-xs text-horizon-accent text-right mt-2">הזן הוצאה חודשית (₪)</p>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {MONTHS.map((month, monthIndex) => (
            <div key={month.key} className="flex flex-col items-center">
                <span className="text-xs text-horizon-accent mb-1">{month.label}</span>
                <Input
                  key={month.key}
                  type="number"
                  placeholder={month.label}
                  value={currentMonthlyAmounts?.[monthIndex] || ''}
                  onChange={(e) => handleMonthlyExpenseChange(expenseType, expenseIndex, monthIndex, e.target.value)}
                  className="form-input-horizon text-center p-1 bg-horizon-card border-horizon"
                  onBlur={() => handleSaveField('detailed_expenses', detailedExpenses)}
                  disabled={disabled || isSaving || !forecast?.is_editable}
                />
            </div>
          ))}
        </div>
      </>
    );
  };

  if (!forecast && !isLoading && forecasts.length === 0 && !showInitialCreationModal) {
    return (
        <div className="min-h-screen bg-horizon-dark p-6" dir="rtl">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-horizon-text">תוכנית עסקית</h1>
                    <div>
                        <Button onClick={() => setShowInitialCreationModal(true)} className="btn-horizon-primary">
                            <Plus className="w-4 h-4 ml-2" />
                            צור תוכנית חדשה
                        </Button>
                    </div>
                </header>
                <Card className="card-horizon text-center p-8">
                    <Rocket className="mx-auto h-12 w-12 text-horizon-primary mb-4" />
                    <CardTitle className="text-horizon-text">מוכנים להתחיל?</CardTitle>
                    <CardDescription className="text-horizon-accent mt-2 mb-6">
                        עדיין לא יצרת תוכנית עסקית. התחל על ידי סנכרון המוצרים שלך או יצירת תוכנית חדשה.
                    </CardDescription>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <TooltipComponent content="סנכרן מוצרים פעילים מהקטלוג שלך כדי להתחיל">
                            <Button
                                onClick={() => setShowInitialCreationModal(true)}
                                disabled={isGenerating}
                                className="btn-horizon-primary min-w-[200px]"
                            >
                                <Plus className="w-4 h-4 ml-2" />
                                צור תוכנית חדשה (AI)
                            </Button>
                        </TooltipComponent>

                        <Button onClick={() => setShowInitialCreationModal(true)} variant="outline" className="min-w-[200px]">
                            <Plus className="w-4 h-4 ml-2" />
                            צור תוכנית ידנית
                        </Button>
                    </div>
                </Card>
            </div>
             {/* Modals for initial creation step and strategic input */}
            <Dialog open={showInitialCreationModal} onOpenChange={setShowInitialCreationModal}>
              <DialogContent className="sm:max-w-[500px] bg-horizon-dark border-horizon" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-horizon-text text-right">יצירת תוכנית עסקית חדשה</DialogTitle>
                  <DialogDescription className="text-horizon-accent text-right">
                    הזן פרטים בסיסיים ובחר קטלוג מוצרים לסנכרון.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="forecast-name" className="text-right text-horizon-text">שם התוכנית</Label>
                    <Input
                      id="forecast-name"
                      value={newForecastNameInput}
                      onChange={(e) => setNewForecastNameInput(e.target.value)}
                      placeholder="לדוגמה: 'תחזית 2025 - אופטימית'"
                      className="bg-horizon-card border-horizon text-white text-right"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="forecast-year" className="text-right text-horizon-text">שנת התחזית</Label>
                    <Input
                      id="forecast-year"
                      type="number"
                      value={newForecastYearInput}
                      onChange={(e) => setNewForecastYearInput(parseInt(e.target.value) || new Date().getFullYear())}
                      className="bg-horizon-card border-horizon text-white text-right"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="catalog-select" className="text-right text-horizon-text">בחר קטלוג לסנכרון מוצרים</Label>
                    <Select
                      value={selectedCatalogToSync?.id || ''}
                      onValueChange={(catalogId) => {
                        const selected = catalogs.find(c => c.id === catalogId);
                        setSelectedCatalogToSync(selected);
                      }}
                      disabled={catalogs.length === 0}
                    >
                      <SelectTrigger className="bg-horizon-card border-horizon text-white text-right">
                        <SelectValue placeholder={catalogs.length > 0 ? "בחר קטלוג..." : "טוען קטלוגים / אין קטלוגים זמינים"} />
                      </SelectTrigger>
                      <SelectContent className="bg-horizon-card border-horizon">
                        {catalogs.map(catalog => (
                          <SelectItem key={catalog.id} value={catalog.id}>{catalog.catalog_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {catalogs.length === 0 && (
                      <p className="text-xs text-red-400 text-right mt-1">
                        לא נמצאו קטלוגים. אנא וודא שהועלו מוצרים לקטלוגים קיימים או צור קטלוג חדש.
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="historical-files" className="text-right text-horizon-text">בחר קבצים היסטוריים לניתוח (אופציונלי)</Label>
                      <div className="max-h-40 overflow-y-auto space-y-2 bg-horizon-card border-horizon p-3 rounded-md">
                          {customerFiles.length > 0 ? (
                              customerFiles.map(file => (
                                  <div key={file.id} className="flex items-center justify-end gap-2">
                                      <Label htmlFor={`file-${file.id}`} className="text-horizon-text text-sm cursor-pointer">{file.filename} ({new Date(file.created_date).toLocaleDateString()})</Label>
                                      <Checkbox
                                          id={`file-${file.id}`}
                                          checked={selectedHistoricalFiles.includes(file.id)}
                                          onCheckedChange={(checked) => {
                                              setSelectedHistoricalFiles(prev =>
                                                  checked ? [...prev, file.id] : prev.filter(id => id !== file.id)
                                              );
                                          }}
                                          className="border-horizon-primary text-horizon-primary"
                                      />
                                  </div>
                              ))
                          ) : (
                              <p className="text-xs text-horizon-accent text-right">לא נמצאו קבצים שהועלו על ידי הלקוח. אנא העלה קבצים דרך דף "העלאת קבצים".</p>
                          )}
                      </div>
                  </div>
                </div>
                <DialogFooter className="flex justify-end gap-3">
                  <Button onClick={() => setShowInitialCreationModal(false)} variant="outline">
                    ביטול
                  </Button>
                  <Button
                    onClick={handleInitialForecastDetailsSubmit}
                    disabled={!newForecastNameInput.trim() || !selectedCatalogToSync || catalogs.length === 0 || isGenerating}
                    className="btn-horizon-primary"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ArrowLeft className="w-4 h-4 ml-2" />}
                    הבא
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showStrategicInput} onOpenChange={setShowStrategicInput}>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-right text-horizon-primary">הגדרת תוכנית אסטרטגית</DialogTitle>
                </DialogHeader>

                <StrategicPlanInputForm
                  customerEmail={customer.email}
                  onFormSubmit={handleStrategicInputSubmit}
                  onClose={handleCancelFullGeneration}
                  existingInput={existingStrategicInput}
                  title="השלם נתונים אסטרטגיים ליצירת תוכנית מלאה"
                  description="פרטים אלו יעזרו ל-AI ליצור תחזית וסיכום מקיפים. המערכת טענה את הנתונים האחרונים שהזנת."
                  submitButtonText="השלם יצירת תוכנית"
                  selectedForecastType={pendingForecastType}
                />
              </DialogContent>
            </Dialog>
        </div>
    );
}

  return (
    <div className="min-h-screen bg-horizon-dark p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {runningProcess && (
            <ProcessStatusDisplay
                process={runningProcess}
                onClearProcess={() => { setRunningProcess(null); setProcessId(null); }}
            />
        )}
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-horizon-text">תוכנית עסקית</h1>
            <div>
              <Button onClick={() => setShowInitialCreationModal(true)} className="btn-horizon-primary">
                <Plus className="w-4 h-4 ml-2" />
                צור תוכנית חדשה
              </Button>
            </div>
        </header>

        {isLoading && !forecast && <div className="text-center text-horizon-accent"><Loader2 className="animate-spin inline-block mr-2" />טוען תוכניות...</div>}

        {forecasts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card className="card-horizon p-4 h-full">
                <h2 className="text-lg font-semibold mb-3 text-horizon-text">התוכניות שלי</h2>
                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
                  {forecasts.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleSelectForecast(f)}
                      className={`w-full text-right p-3 rounded-lg transition-colors ${forecast?.id === f.id ? 'bg-horizon-primary/20 border border-horizon-primary' : 'hover:bg-horizon-card/50'}`}
                    >
                      <p className="font-semibold text-horizon-text">{f.forecast_name}</p>

                      <div className="flex justify-between items-center text-xs text-horizon-accent mt-1">
                        <span>{f.version_name || 'v1.0'}</span>
                        <Badge
                          variant="outline"
                          className={`mr-2 ${
                            f.is_system_generated
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          }`}
                        >
                          {f.is_system_generated ? 'AI' : 'ידני'}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center text-xs text-horizon-accent mt-1">
                        <span>{new Date(f.created_date).toLocaleDateString('he-IL')}</span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-4 h-4 cursor-pointer ${
                                (f.rating || 0) >= star
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-500'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRatingChange(f, star);
                              }}
                            />
                          ))}
                          {(f.rating || 0) > 0 && (
                            <StarOff
                              className="w-4 h-4 cursor-pointer text-red-400 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRatingChange(f, 0);
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-2">
                        {f.business_plan_text ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {e.stopPropagation(); handleShowBusinessPlan(f)}}
                            className="bg-horizon-card/50 text-horizon-text hover:bg-horizon-card/80 text-xs"
                          >
                            <FileText className="w-3 h-3 ml-1" />
                            צפה בתוכנית
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {e.stopPropagation(); handleGenerateBusinessPlan(f)}}
                            disabled={isGenerating}
                            className="bg-horizon-card/50 text-horizon-text hover:bg-horizon-card/80 text-xs"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin ml-1" />
                                יוצר..
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3 h-3 ml-1" />
                                יצירת תוכנית במלל
                              </>
                            )}
                          </Button>
                        )}
                        {f.services_data && f.services_data.length > 0 &&
                         (!f.profit_loss_summary || !f.sales_forecast_data?.monthly_forecasts || f.sales_forecast_data.monthly_forecasts.length === 0) && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInitiateFullForecastGeneration(f);
                            }}
                            className="text-xs btn-horizon-secondary"
                            disabled={isGenerating}
                          >
                            <Wand2 className="w-3 h-3 ml-1" />
                            יצירת תוכנית מלאה
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {e.stopPropagation(); handleDeleteForecast(f.id)}}
                          className="text-red-400 border-red-400 hover:bg-red-500/20 text-xs"
                        >
                          מחק
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-3">
              {forecast ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-right">
                      {editingForecastName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={forecastNameInput}
                            onChange={(e) => setForecastNameInput(e.target.value)}
                            onBlur={() => handleSaveField('forecast_name', forecastNameInput)}
                            className="text-3xl font-bold bg-horizon-card border-horizon text-horizon-text"
                            disabled={!forecast.is_editable || isSavingName}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingForecastName(false)}
                            disabled={isSavingName}
                          >
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          </Button>
                        </div>
                      ) : (
                        <h1
                          className="text-3xl font-bold text-horizon-text inline-flex items-center gap-2 cursor-pointer"
                          onClick={() => forecast.is_editable && setEditingForecastName(true)}
                        >
                          {forecast.forecast_name || "תוכנית עסקית"}
                          {forecast.is_editable && <Edit className="w-5 h-5 text-horizon-accent" />}
                        </h1>
                      )}
                      <p className="text-horizon-accent mt-2">
                        תכנון פיננסי חכם לשנת {forecast.forecast_year}
                        {forecast.is_system_generated && (
                          <Badge variant="outline" className="mr-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                            נוצר ע"י AI
                          </Badge>
                        )}
                        {forecast.version_name && (
                          <span className="mr-2 text-sm text-horizon-accent">
                            ({forecast.version_name})
                          </span>
                        )}
                      </p>
                    </div>
                    {onBack && (
                      <Button 
                        onClick={onBack}
                        variant="outline"
                        className="border-horizon text-horizon-accent"
                      >
                        <ArrowLeft className="w-4 h-4 ml-2" />
                        חזור לרשימה
                      </Button>
                    )}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleSaveField('all', forecast)}
                        disabled={isSaving || !forecast.is_editable}
                        className="btn-horizon-primary"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                        שמור תוכנית
                      </Button>
                    </div>
                  </div>

                  {warnings.length > 0 && (
                    <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/30">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <AlertDescription className="text-right text-yellow-300">
                        <strong>נקודות לשיפור:</strong>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          {warnings.map((warning, index) => (
                            <li key={index} className="text-sm">{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Card className="card-horizon">
                      <CardHeader>
                        <CardTitle className="text-horizon-text flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-horizon-primary" />
                          סיכום רווח והפסד
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-horizon-accent">סך הכנסות (ללא מע״מ)</span>
                            <span className="text-horizon-text font-semibold">{formatCurrency(summary?.total_revenue || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-horizon-accent">עלות גלם</span>
                            <span className="text-red-400">{formatCurrency(summary?.total_cogs || 0)}</span>
                          </div>
                          <div className="flex justify-between border-t border-horizon pt-2">
                            <span className="text-horizon-accent font-medium">רווח גולמי</span>
                            <span className={`font-semibold ${summary?.gross_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(summary?.gross_profit || 0)}
                            </span>
                          </div>

                          <div className="text-sm text-horizon-accent font-medium mt-4">הוצאות תפעוליות:</div>
                          <div className="mr-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-horizon-accent">שכר עובדים</span>
                              <span className="text-horizon-text">{formatCurrency(calculateEmployeeCosts(forecast).totalSalaries || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-horizon-accent">מכירות ושיווק</span>
                              <span className="text-horizon-text">{formatCurrency((detailedExpenses?.marketing_sales || []).reduce((sum, item) => sum + (item.amount || 0), 0))}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-horizon-accent">הנהלה וכלליות</span>
                              <span className="text-horizon-text">{formatCurrency((detailedExpenses?.admin_general || []).reduce((sum, item) => sum + (item.amount || 0), 0))}</span>
                            </div>
                          </div>

                          <div className="flex justify-between border-t border-horizon pt-2">
                            <span className="text-horizon-accent font-medium">רווח תפעולי</span>
                            <span className={`font-semibold ${summary?.operational_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(summary?.operational_profit || 0)}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-horizon-accent">מס ({forecast?.other_costs?.tax_rate || 23}%)</span>
                            <span className="text-red-400">{formatCurrency(summary?.tax_amount || 0)}</span>
                          </div>

                          <div className="flex justify-between border-t border-horizon pt-2">
                            <span className="text-horizon-text font-bold">רווח נקי</span>
                            <span className={`font-bold text-lg ${summary?.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(summary?.net_profit || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div className="border-t border-horizon pt-4">
                            <h4 className="text-horizon-text font-medium mb-3 flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              מגמות מכירות חודשיות
                            </h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={salesChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} formatter={formatCurrency}/>
                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor: '#1F2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#F3F4F6'
                                  }}
                                  formatter={(value) => formatCurrency(value)}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="revenue"
                                  stroke={COLORS.neutral}
                                  strokeWidth={2}
                                  dot={{ fill: COLORS.neutral }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          

                          <div className="border-t border-horizon pt-4">
                            <h4 className="text-horizon-text font-medium mb-3 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              התפלגות הוצאות
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                              <RechartsPieChart>
                                <Pie
                                  dataKey="value"
                                  data={expensesPieData}
                                  cx="50%"
                                  cy="40%"
                                  outerRadius={70}
                                  innerRadius={20}
                                  labelLine={false}
                                  label={false}
                                >
                                  {expensesPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor: '#1F2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#F3F4F6',
                                    fontSize: '14px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                  }}
                                  formatter={(value, name) => [
                                    formatCurrency(value), 
                                    name
                                  ]}
                                />
                                <Legend 
                                  layout="horizontal" 
                                  align="center" 
                                  verticalAlign="bottom" 
                                  wrapperStyle={{ 
                                    paddingTop: '20px',
                                    fontSize: '13px',
                                    color: '#F3F4F6',
                                    textAlign: 'center'
                                  }}
                                  formatter={(value, entry) => {
                                    const data = expensesPieData.find(item => item.name === value);
                                    const total = expensesPieData.reduce((sum, item) => sum + item.value, 0);
                                    const percentage = data ? ((data.value / total) * 100).toFixed(0) : '0';
                                    return `${value} - ${percentage}%`;
                                  }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-horizon-card mb-6">
                          <TabsTrigger value="products" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                            <Package className="w-4 h-4 ml-2" />
                            מוצרים ושירותים
                          </TabsTrigger>
                          <TabsTrigger value="sales" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                            <TrendingUp className="w-4 h-4 ml-2" />
                            תחזית מכירות
                          </TabsTrigger>
                          <TabsTrigger value="employees" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                            <DollarSign className="w-4 h-4 ml-2" />
                            שכר
                          </TabsTrigger>
                          <TabsTrigger value="expenses" className="data-[state=active]:bg-horizon-primary data-[state=active]:text-white">
                            <BarChart3 className="w-4 h-4 ml-2" />
                            הוצאות
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="products">
                          <Card className="card-horizon">
                            <CardHeader>
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-horizon-text flex items-center gap-2">
                                  <Package className="w-5 h-5" />
                                  מוצרים ושירותים
                                </CardTitle>
                                <div className="flex gap-2">
                                  <TooltipComponent content={isCatalogSynced ? "מוצרים סונכרנו בהצלחה מהקטלוג" : "סנכרן מוצרים מהקטלוג כדי לכלול אותם בתחזית AI"}>
                                     <Button
                                       onClick={handleSyncFromCatalog}
                                       disabled={isSaving || isLoadingCatalogs || !forecast?.is_editable}
                                       className={isCatalogSynced ? "bg-green-600 hover:bg-green-700 text-white" : "btn-horizon-primary"}
                                     >
                                       {isLoadingCatalogs ? (
                                         <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                       ) : (
                                         <RefreshCw className="w-4 h-4 ml-2" />
                                       )}
                                       {isLoadingCatalogs ? "טוען..." : isCatalogSynced ? "מסונכרן מקטלוג" : "סנכרן מקטלוג קיים"}
                                       {isCatalogSynced && !isLoadingCatalogs && <span className="mr-1">✅</span>}
                                     </Button>
                                  </TooltipComponent>

                                  <Button onClick={addService} variant="outline" className="border-horizon-accent text-horizon-accent" disabled={!forecast?.is_editable}>
                                    <Plus className="w-4 h-4 ml-2" />
                                    הוסף מוצר
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <Alert className="mb-4 bg-blue-500/10 border-blue-500/30">
                                <AlertDescription className="text-right text-blue-300">
                                  <strong>עצה:</strong> סנכרן מהקטלוג הקיים כדי לחסוך זמן בהזנת מוצרים.
                                  רווח גולמי ואחוז הרווח מתחשבים אוטומטית.
                                </AlertDescription>
                              </Alert>
                              {isCatalogSynced && services && services.length > 0 && (
                                <Alert className="mb-4 bg-green-500/10 border-green-500/30">
                                  <Package className="h-4 w-4 text-green-400" />
                                  <AlertDescription className="text-right text-green-300">
                                    סונכרנו {services.length} מוצרים פעילים מהקטלוג בהצלחה.
                                    <br/>
                                    שינויים ידניים במוצרים כאן ישבשו את הסנכרון.
                                  </AlertDescription>
                                </Alert>
                              )}

                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-b border-horizon">
                                      <TableHead className="text-right p-3 text-horizon-text font-medium">מוצר/שירות</TableHead>
                                      <TableHead className="text-right p-3 text-horizon-text font-medium">עלות קנייה (₪)</TableHead>
                                      <TableHead className="text-right p-3 text-horizon-text font-medium">מחיר מכירה (₪)</TableHead>
                                      <TableHead className="text-right p-3 text-horizon-text font-medium">רווח גולמי</TableHead>
                                      <TableHead className="text-right p-3 text-horizon-text font-medium">אחוז רווח</TableHead>
                                      <TableHead className="text-right p-3 text-horizon-text font-medium">קטגוריה</TableHead>
                                     <TableHead className="text-right p-3 text-horizon-text font-medium">פעולות</TableHead>                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {paginatedServices.map((service, index) => {
                                      const grossProfit = (service.selling_price || 0) - (service.cost_price || 0);
                                      const profitPercentage = service.cost_price > 0 ? ((grossProfit / service.cost_price) * 100) : 0;

                                      return (
                                        <TableRow key={index} className="border-b border-horizon/50 hover:bg-horizon-card/20">
                                          <TableCell className="p-3 text-horizon-text font-medium">
                                            <Input
                                              value={service.service_name}
                                              onChange={(e) => handleServiceChange(index, 'service_name', e.target.value)}
                                              onBlur={() => handleSaveField('services', services)}
                                              placeholder="שם מוצר"
                                              className="text-right bg-horizon-card border-horizon"
                                              disabled={!forecast?.is_editable}
                                            />
                                          </TableCell>
                                          <TableCell className="p-3 text-horizon-text">
                                            <Input
                                              type="number"
                                              value={service.cost_price}
                                              onChange={(e) => handleServiceChange(index, 'cost_price', parseFloat(e.target.value) || 0)}
                                              onBlur={() => handleSaveField('services', services)}
                                              placeholder="0"
                                              className="text-right bg-horizon-card border-horizon"
                                              disabled={!forecast?.is_editable}
                                            />
                                          </TableCell>
                                          <TableCell className="p-3 text-horizon-text">
                                            <Input
                                              type="number"
                                              value={service.selling_price}
                                              onChange={(e) => handleServiceChange(index, 'selling_price', parseFloat(e.target.value) || 0)}
                                              onBlur={() => handleSaveField('services', services)}
                                              placeholder="0"
                                              className="text-right bg-horizon-card border-horizon"
                                              disabled={!forecast?.is_editable}
                                            />
                                          </TableCell>
                                          <TableCell className={`p-3 font-medium ${grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatCurrency(grossProfit)}
                                          </TableCell>
                                          <TableCell className={`p-3 font-medium ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {profitPercentage.toFixed(1)}%
                                          </TableCell>
                                          <TableCell className="p-3 text-horizon-accent">
                                            <Input
                                              value={service.category}
                                              onChange={(e) => handleServiceChange(index, 'category', e.target.value)}
                                              onBlur={() => handleSaveField('services', services)}
                                              placeholder="קטגוריה"
                                              className="text-right bg-horizon-card border-horizon"
                                              disabled={!forecast?.is_editable}
                                            />
                                          </TableCell>
                                          <TableCell className="p-3">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeService(index)}
                                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                              disabled={!forecast?.is_editable}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>

                                {services.length > ITEMS_PER_PAGE && (
                                  <Pagination
                                    currentPage={productsCurrentPage}
                                    totalPages={totalProductPages}
                                    onPageChange={setProductsCurrentPage}
                                  />
                                )}

                                {services.length === 0 && (
                                  <div className="text-center py-8 text-horizon-accent">
                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>לא הוספו מוצרים עדיין</p>
                                    <p className="text-sm mt-1">סנכרן מהקטלוג או הוסף מוצרים ידנית</p>
                                  </div>
                                )}
                              </div>

                              {services.length > 0 && (
                                <div className="mt-6 p-4 bg-horizon-card/30 rounded-lg">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                    <div>
                                      <div className="text-2xl font-bold text-horizon-text">{services.length}</div>
                                      <div className="text-sm text-horizon-accent">סה״כ מוצרים</div>
                                    </div>
                                    <div>
                                      <div className="text-2xl font-bold text-green-400">
                                        {(services.reduce((sum, s) => sum + s.gross_margin_percentage, 0) / services.length).toFixed(1)}%
                                      </div>
                                      <div className="text-sm text-horizon-accent">רווח ממוצע</div>
                                    </div>
                                    <div>
                                      <div className="text-2xl font-bold text-horizon-primary">
                                        {formatCurrency(services.reduce((sum, s) => sum + (s.selling_price - s.cost_price), 0))}
                                      </div>
                                      <div className="text-sm text-horizon-accent">רווח גולמי פוטנציאלי</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="sales" className="space-y-6">
                          <Card className="card-horizon">
                            <CardHeader>
                              <CardTitle className="text-horizon-text flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                תחזית מכירות שנתית AI
                              </CardTitle>
                              <CardDescription className="text-horizon-accent">
                                יש למלא מוצרים מהקטלוג מהקטלוג תחילה. החזרות גולמי יחידות.
                                הערות מחושבים אוטומטית
                              </CardDescription>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  onClick={exportToExcel}
                                  disabled={salesForecastData.monthly_forecasts.length === 0}
                                  variant="outline"
                                  className="border-horizon-accent text-horizon-accent"
                                >
                                  <Download className="w-4 h-4 ml-2" />
                                  ייצוא
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <Alert className="mb-4 bg-blue-500/10 border-blue-500/30">
                                <AlertDescription className="text-right text-blue-300">
                                  <strong>AI חכם:</strong> התחזית מבוססת על פרופיל העסק שלך, נתונים היסטוריים,
                                  ומגמות שוק עדכניות. בחר בין תחזית אופטימית (גידול 15-25%) לפסימית (גידול 5-10%).
                                </AlertDescription>
                              </Alert>

                              {services.length === 0 ? (
                                <div className="text-center py-8 text-horizon-accent">
                                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                  <p>הוסף מוצרים תחילה כדי ליצור תחזית מכירות</p>
                                  <p className="text-sm mt-1">עבור לטאב "מוצרים ושירותים" להוספת מוצרים</p>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <Table className="w-full text-sm">
                                    <thead>
                                      <TableRow className="border-b border-horizon">
                                        <TableHead className="text-right p-3 text-horizon-text font-medium min-w-[150px]">מוצר/שירות</TableHead>
                                        {MONTHS.map(month => (
                                          <TableHead key={month.key} className="text-right p-2 text-horizon-text font-medium min-w-[70px]">
                                            {month.label}
                                          </TableHead>
                                        ))}
                                        <TableHead className="text-right p-3 text-horizon-text font-medium min-w-[100px]">סה״כ שנתי</TableHead>
                                        <TableHead className="text-right p-3 text-horizon-text font-medium min-w-[100px]">הכנסות ₪</TableHead>
                                      </TableRow>
                                    </thead>
                                    <tbody>
                                     {paginatedServicesForSales.map((service, serviceIndex) => {
                                       const forecastEntry = forecastMap.get(service.service_name) || {
                                         service_name: service.service_name,
                                         ...MONTHS.reduce((acc, month) => ({ ...acc, [month.key]: 0 }), {}),
                                         total_yearly: 0
                                       };

                                        const totalYearly = MONTHS.reduce((sum, month) => sum + (forecastEntry[month.key] || 0), 0);
                                        const totalRevenue = totalYearly * service.selling_price;

                                        return (
                                          <TableRow key={service.service_name} className="border-b border-horizon/50 hover:bg-horizon-card/20">
                                            <TableCell className="p-3 text-horizon-text font-medium">{service.service_name}</TableCell>
                                            {MONTHS.map(month => (
                                              <TableCell key={month.key} className="p-2">
                                                <Input
                                                  type="number"
                                                  value={forecastEntry[month.key] || 0}
                                                  onChange={(e) => {
                                                    const value = parseInt(e.target.value) || 0;
                                                    handleSalesForecastChange(service.service_name, month.key, value);
                                                  }}
                                                  onBlur={() => handleSaveField('sales_forecast', salesForecastData)}
                                                  className="w-16 text-right text-xs bg-horizon-card border-horizon"
                                                  min="0"
                                                  disabled={!forecast?.is_editable}
                                                />
                                              </TableCell>
                                            ))}
                                            <TableCell className="p-3 text-horizon-text font-bold">
                                              {totalYearly.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="p-3 text-green-400 font-bold">
                                              {formatCurrency(totalRevenue)}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <TableRow className="border-t-2 border-horizon bg-horizon-card/20">
                                        <TableCell className="p-3 text-horizon-text font-bold">סה״כ כל המוצרים</TableCell>
                                        {MONTHS.map(month => (
                                          <TableCell key={month.key} className="p-2 text-horizon-text font-semibold">
                                            {(salesForecastData?.monthly_forecasts || []).reduce((sum, forecastEntry) =>
                                              sum + (forecastEntry[month.key] || 0), 0
                                            ).toLocaleString()}
                                          </TableCell>
                                        ))}
                                        <TableCell className="p-3 text-horizon-text font-bold">
                                          {(salesForecastData?.monthly_forecasts || []).reduce((sum, forecastEntry) =>
                                            sum + MONTHS.reduce((monthSum, month) => monthSum + (forecastEntry[month.key] || 0), 0), 0
                                          ).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="p-3 text-green-400 font-bold">
                                          {formatCurrency((salesForecastData?.monthly_forecasts || []).reduce((sum, forecastEntry) => {
                                            const service = (services || []).find(s => s.service_name === forecastEntry.service_name);
                                            const totalUnits = MONTHS.reduce((monthSum, month) => monthSum + (forecastEntry[month.key] || 0), 0);
                                            return sum + (totalUnits * (service?.selling_price || 0));
                                          }, 0))}
                                        </TableCell>
                                      </TableRow>
                                    </tfoot>
                                  </Table>
                                  {services.length > ITEMS_PER_PAGE && (
                                    <Pagination
                                      currentPage={salesForecastCurrentPage}
                                      totalPages={totalSalesPages}
                                      onPageChange={setSalesForecastCurrentPage}
                                    />
                                  )}
                                </div>
                              )}

                              {(salesForecastData?.monthly_forecasts || []).length > 0 && (() => {
                                // ✅ FIX #3: Pre-calculate all summary stats once
                                const salesSummary = (salesForecastData?.monthly_forecasts || []).reduce((acc, forecastEntry) => {
                                  const service = servicesMap.get(forecastEntry.service_name);
                                  const totalUnits = MONTHS.reduce((sum, month) => sum + (forecastEntry[month.key] || 0), 0);
                                  
                                  acc.totalUnits += totalUnits;
                                  acc.totalRevenue += totalUnits * (service?.selling_price || 0);
                                  acc.totalCost += totalUnits * (service?.cost_price || 0);
                                  acc.totalProfit += totalUnits * ((service?.selling_price || 0) - (service?.cost_price || 0));
                                  
                                  return acc;
                                }, { totalUnits: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 });

                                return (
                                  <div className="mt-6 p-4 bg-horizon-card/30 rounded-lg">
                                    <h4 className="text-horizon-text font-medium mb-3">סיכום תחזית שנתית</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                      <div>
                                        <div className="text-2xl font-bold text-horizon-text">
                                          {salesSummary.totalUnits.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-horizon-accent">יחידות שנתיות</div>
                                      </div>
                                      <div>
                                        <div className="text-2xl font-bold text-green-400">
                                          {formatCurrency(salesSummary.totalRevenue)}
                                        </div>
                                        <div className="text-sm text-horizon-accent">הכנסות שנתיות</div>
                                      </div>
                                      <div>
                                        <div className="text-2xl font-bold text-blue-400">
                                          {formatCurrency(salesSummary.totalCost)}
                                        </div>
                                        <div className="text-sm text-horizon-accent">עלות גלם</div>
                                      </div>
                                      <div>
                                        <div className="text-2xl font-bold text-yellow-400">
                                          {formatCurrency(salesSummary.totalProfit)}
                                        </div>
                                        <div className="text-sm text-horizon-accent">רווח גולמי</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="employees">
                          <Card className="card-horizon">
                            <CardHeader>
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-horizon-text flex items-center gap-2">
                                  <Users className="w-5 h-5 text-horizon-primary" />
                                  עובדים קיימים
                                </CardTitle>
                                <Button onClick={addGlobalEmployee} variant="outline" className="btn-horizon-secondary" disabled={!forecast?.is_editable}>
                                  <Plus className="w-4 h-4 ml-2" />
                                  הוסף עובד
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="border-b border-horizon">
                                      {['תפקיד', 'סוג משרה', 'שכר בסיס (₪)', 'תוספת שכר (%)', 'נתונים נוספים', 'חודש התחלה', 'חודש סיום', 'פעולות'].map(header => (
                                        <th key={header} className="p-3 text-right text-sm font-semibold text-horizon-accent">{header}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {employees.filter(e => e.type === 'global').map((employee, index) => (
                                      <TableRow key={`global-${index}`} className="border-b border-horizon/50">
                                        <TableCell className="p-2 min-w-[150px]">
                                          <Input
                                            placeholder="למשל, מנהל שיווק"
                                            value={employee.employee_role || ''}
                                            onChange={(e) => handleEmployeeChange(index, 'employee_role', e.target.value)}
                                            onBlur={() => handleSaveField('employees', employees)}
                                            className="w-full bg-horizon-card border-horizon text-right"
                                            disabled={!forecast?.is_editable}
                                          />
                                        </TableCell>
                                        <TableCell className="p-2 min-w-[150px]">
                                           <Select
                                            value={employee.job_type || ''}
                                            onValueChange={(value) => handleEmployeeChange(index, 'job_type', value)}
                                            onOpenChange={() => handleSaveField('employees', employees)}
                                            disabled={!forecast?.is_editable}
                                          >
                                            <SelectTrigger className="w-full bg-horizon-card border-horizon text-right"><SelectValue placeholder="בחר סוג משרה" /></SelectTrigger>
                                            <SelectContent className="bg-horizon-card border-horizon">
                                              {JOB_TYPES.map(type => (
                                                <SelectItem key={type.value} value={type.value} className="text-horizon-text">
                                                  {type.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell className="p-2 min-w-[120px]">
                                          <Input
                                            type="number"
                                            placeholder="0"
                                            value={employee.base_salary || ''}
                                            onChange={(e) => handleEmployeeChange(index, 'base_salary', parseFloat(e.target.value) || 0)}
                                            onBlur={() => handleSaveField('employees', employees)}
                                            className="w-full bg-horizon-card border-horizon text-right"
                                            disabled={!forecast?.is_editable}
                                          />
                                        </TableCell>
                                        <TableCell className="p-2 min-w-[120px]">
                                          <Input
                                            type="number"
                                            placeholder="0"
                                            value={employee.salary_addition_percentage || ''}
                                            onChange={(e) => handleEmployeeChange(index, 'salary_addition_percentage', parseFloat(e.target.value) || 0)}
                                            onBlur={() => handleSaveField('employees', employees)}
                                            className="w-full bg-horizon-card border-horizon text-right"
                                            disabled={!forecast?.is_editable}
                                          />
                                        </TableCell>
                                        <TableCell className="p-2 min-w-[150px] text-horizon-accent text-sm">
                                          {employee.job_type === 'hourly' && (
                                            <Input type="number" placeholder="שעות חודשיות" value={employee.hours_per_month || ''} onChange={e => handleEmployeeChange(index, 'hours_per_month', parseFloat(e.target.value) || 0)} onBlur={() => handleSaveField('employees', employees)} className="w-full bg-horizon-card border-horizon text-right" disabled={!forecast?.is_editable}/>
                                          )}
                                          {employee.job_type === 'freelancer' && (
                                            <Input type="number" placeholder="פרויקטים בחודש" value={employee.projects_per_month || ''} onChange={e => handleEmployeeChange(index, 'projects_per_month', parseFloat(e.target.value) || 0)} onBlur={() => handleSaveField('employees', employees)} className="w-full bg-horizon-card border-horizon text-right" disabled={!forecast?.is_editable}/>
                                          )}
                                          {(employee.job_type === 'full_time' || employee.job_type === 'part_time') && 'N/A'}
                                        </TableCell>
                                        <TableCell className="p-2 min-w-[140px]">
                                           <Select
                                            value={employee.start_month ? String(employee.start_month) : ''}
                                            onValueChange={(value) => handleEmployeeChange(index, 'start_month', parseInt(value) || 1)}
                                            onOpenChange={() => handleSaveField('employees', employees)}
                                            disabled={!forecast?.is_editable}
                                          >
                                            <SelectTrigger className="w-full bg-horizon-card border-horizon text-right"><SelectValue placeholder="בחר חודש" /></SelectTrigger>
                                            <SelectContent className="bg-horizon-card border-horizon">
                                              {MONTHS.map((month, monthIndex) => (
                                                <SelectItem key={month.key} value={(monthIndex + 1).toString()} className="text-horizon-text">
                                                  {month.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell className="p-2 min-w-[140px]">
                                          <Select
                                            value={employee.end_month ? String(employee.end_month) : ''}
                                            onValueChange={(value) => handleEmployeeChange(index, 'end_month', parseInt(value) || 12)}
                                            onOpenChange={() => handleSaveField('employees', employees)}
                                            disabled={!forecast?.is_editable}
                                          >
                                            <SelectTrigger className="w-full bg-horizon-card border-horizon text-right"><SelectValue placeholder="בחר חודש" /></SelectTrigger>
                                            <SelectContent className="bg-horizon-card border-horizon">
                                              {MONTHS.map((month, monthIndex) => (
                                                <SelectItem key={month.key} value={(monthIndex + 1).toString()} className="text-horizon-text">
                                                  {month.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell className="p-2">
                                          <Button onClick={() => removeEmployee(index)} variant="ghost" size="icon" className="text-red-400 hover:bg-red-900/20" disabled={!forecast?.is_editable}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </tbody>
                                </table>
                                 {employees.filter(e => e.type === 'global').length === 0 && (
                                    <div className="text-center py-8 text-horizon-accent">
                                        <p>לא הוספו עובדים קיימים. לחץ על "הוסף עובד" כדי להתחיל.</p>
                                    </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="card-horizon">
                             <CardHeader>
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-horizon-text flex items-center gap-2">
                                  <UserPlus className="w-5 h-5 text-horizon-primary" />
                                  גיוסים מתוכננים
                                </CardTitle>
                                <Button onClick={addPlannedHire} variant="outline" className="btn-horizon-secondary" disabled={!forecast?.is_editable}>
                                  <Plus className="w-4 h-4 ml-2" />
                                  הוסף גיוס
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                               <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="border-b border-horizon">
                                      {['תפקיד', 'כמות', 'חודש גיוס', 'שכר חודשי צפוי (₪)', 'פעולות'].map(header => (
                                        <th key={header} className="p-3 text-right text-sm font-semibold text-horizon-accent">{header}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {employees.filter(e => e.type === 'planned').map((hire, index) => (
                                       <TableRow key={`planned-${index}`} className="border-b border-horizon/50">
                                         <TableCell className="p-2 min-w-[200px]">
                                           <Input placeholder="למשל: נציג מכירות" value={hire.role || ''} onChange={e => handleEmployeeChange(index, 'role', e.target.value)} onBlur={() => handleSaveField('employees', employees)} className="w-full bg-horizon-card border-horizon text-right" disabled={!forecast?.is_editable} />
                                         </TableCell>
                                          <TableCell className="p-2 min-w-[100px]">
                                           <Input type="number" placeholder="1" value={hire.count || ''} onChange={e => handleEmployeeChange(index, 'count', parseInt(e.target.value) || 0)} onBlur={() => handleSaveField('employees', employees)} className="w-full bg-horizon-card border-horizon text-right" disabled={!forecast?.is_editable} />
                                         </TableCell>
                                         <TableCell className="p-2 min-w-[160px]">
                                            <Select
                                                value={hire.month_of_hire ? String(hire.month_of_hire) : ''}
                                                onValueChange={(value) => handleEmployeeChange(index, 'month_of_hire', parseInt(value) || 1)}
                                                onOpenChange={() => handleSaveField('employees', employees)}
                                                disabled={!forecast?.is_editable}
                                            >
                                                <SelectTrigger className="w-full bg-horizon-card border-horizon text-right"><SelectValue placeholder="בחר חודש" /></SelectTrigger>
                                                <SelectContent className="bg-horizon-card border-horizon">
                                                  {MONTHS.map((month, monthIndex) => (
                                                    <SelectItem key={month.key} value={(monthIndex + 1).toString()} className="text-horizon-text">
                                                      {month.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                            </Select>
                                         </TableCell>
                                         <TableCell className="p-2 min-w-[200px]">
                                           <Input type="number" placeholder="0" value={hire.estimated_monthly_salary || ''} onChange={e => handleEmployeeChange(index, 'estimated_monthly_salary', parseFloat(e.target.value) || 0)} onBlur={() => handleSaveField('employees', employees)} className="w-full bg-horizon-card border-horizon text-right" disabled={!forecast?.is_editable} />
                                         </TableCell>
                                         <TableCell className="p-2">
                                           <Button onClick={() => removeEmployee(index)} variant="ghost" size="icon" className="text-red-400 hover:bg-red-900/20" disabled={!forecast?.is_editable}>
                                             <Trash2 className="w-4 h-4" />
                                           </Button>
                                         </TableCell>
                                       </TableRow>
                                    ))}
                                  </tbody>
                                </table>
                                 {employees.filter(e => e.type === 'planned').length === 0 && (
                                    <div className="text-center py-8 text-horizon-accent">
                                        <p>אין גיוסים מתוכננים. לחץ על "הוסף גיוס" כדי להוסיף.</p>
                                    </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="card-horizon">
                            <CardHeader>
                              <CardTitle className="text-horizon-text">סיכום עלויות שכר</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                                <div className="p-4 bg-horizon-card/50 rounded-lg">
                                    <div className="text-horizon-accent text-sm mb-1">עלות שכר שנתית כוללת</div>
                                    <div className="text-2xl font-bold text-horizon-primary">{formatCurrency(calculateEmployeeCosts(forecast).totalSalaries || 0)}</div>
                                </div>
                                <div className="p-4 bg-horizon-card/50 rounded-lg">
                                    <div className="text-horizon-accent text-sm mb-1">עלות שכר ממוצעת חודשית</div>
                                    <div className="text-2xl font-bold text-horizon-primary">{formatCurrency((calculateEmployeeCosts(forecast).totalSalaries / 12) || 0)}</div>
                                </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="expenses">
                          <div className="space-y-6">
                            <Card className="card-horizon">
                              <CardHeader>
                                <CardTitle className="text-horizon-text flex items-center gap-2">
                                  <Package className="w-5 h-5" />
                                  עלות גלם (אוטומטית)
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Alert className="mb-4 bg-green-500/10 border-green-500/30">
                                  <AlertDescription className="text-right text-green-300">
                                    <strong>חישוב אוטומטי:</strong> עלות הגלם מחושבת אוטומטית על בסיס תחזית המכירות ועלות הקנייה של כל מוצר.
                                  </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="text-center p-4 bg-horizon-card/30 rounded-lg">
                                    <div className="text-3xl font-bold text-horizon-text">
                                      {formatCurrency(summary?.total_cogs || 0)}
                                    </div>
                                    <div className="text-sm text-horizon-accent">עלות גלם שנתית</div>
                                  </div>
                                  <div className="text-center p-4 bg-horizon-card/30 rounded-lg">
                                    <div className="text-3xl font-bold text-blue-400">
                                      {formatCurrency((summary?.total_cogs || 0) / 12)}
                                    </div>
                                    <div className="text-sm text-horizon-accent">עלות גלם ממוצעת חודשית</div>
                                  </div>
                                </div>


                              </CardContent>
                            </Card>

                            <Card className="card-horizon">
                              <CardHeader>
                                <CardTitle className="text-horizon-text flex items-center gap-2">
                                  <DollarSign className="w-5 h-5" />
                                  שכר עובדים (אוטומטי)
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Alert className="mb-4 bg-blue-500/10 border-blue-500/30">
                                  <AlertDescription className="text-right text-blue-300">
                                    <strong>נתונים מטאב השכר:</strong> הנתונים מועברים אוטומטית מטאב השכר וכוללים את עלות המעביד המלאה.
                                  </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="text-center p-4 bg-horizon-card/30 rounded-lg">
                                    <div className="text-3xl font-bold text-horizon-text">
                                      {formatCurrency(calculateEmployeeCosts(forecast).totalSalaries || 0)}
                                    </div>
                                    <div className="text-sm text-horizon-accent">עלות שכר שנתית</div>
                                  </div>
                                  <div className="text-center p-4 bg-horizon-card/30 rounded-lg">
                                    <div className="text-3xl font-bold text-yellow-400">
                                      {formatCurrency((calculateEmployeeCosts(forecast).totalSalaries / 12) || 0)}
                                    </div>
                                    <div className="text-sm text-horizon-accent">עלות שכר חודשית</div>
                                  </div>
                                </div>

                                {(employees.filter(e => e.type === 'global').length > 0 || employees.filter(e => e.type === 'planned').length > 0) && (
                                  <div className="mt-4 overflow-x-auto">
                                    <Table className="w-full text-sm">
                                      <thead>
                                        <TableRow className="border-b border-horizon">
                                          <TableHead className="text-right p-2 text-horizon-text">עובד/תפקיד</TableHead>
                                          <TableHead className="text-right p-2 text-horizon-text">סוג</TableHead>
                                          <TableHead className="text-right p-2 text-horizon-text">עלות חודשית ממוצעת</TableHead>
                                          <TableHead className="text-right p-2 text-horizon-text">עלות שנתית</TableHead>
                                        </TableRow>
                                      </thead>
                                      <tbody>
                                        {employees.filter(e => e.type === 'global').map((employee, index) => (
                                          <TableRow key={`emp-${index}`} className="border-b border-horizon/50">
                                            <TableCell className="p-2 text-horizon-text">{employee.employee_role}</TableCell>
                                            <TableCell className="p-2 text-horizon-accent">
                                              {JOB_TYPES.find(t => t.value === employee.job_type)?.label}
                                            </TableCell>
                                            <TableCell className="p-2 text-horizon-text">{formatCurrency(employee.monthly_total_cost || 0)}</TableCell>
                                            <TableCell className="p-2 text-yellow-400 font-semibold">{formatCurrency((employee.monthly_total_cost * 12) || 0)}</TableCell>
                                          </TableRow>
                                        ))}
                                        {employees.filter(e => e.type === 'planned').map((hire, index) => (
                                          <TableRow key={`hire-${index}`} className="border-b border-horizon/50">
                                            <TableCell className="p-2 text-horizon-text">{hire.role} ({hire.count})</TableCell>
                                            <TableCell className="p-2 text-horizon-accent">גיוס מתוכנן</TableCell>
                                            <TableCell className="p-2 text-horizon-text">
                                              {formatCurrency(((hire.estimated_monthly_salary || 0) * (hire.count || 1) * (1 + (25 / 100))) || 0)}
                                            </TableCell>
                                            <TableCell className="p-2 text-yellow-400 font-semibold">
                                              {formatCurrency((((hire.estimated_monthly_salary || 0) * (hire.count || 1) * (1 + (25 / 100))) * (12 - (hire.month_of_hire || 1) + 1)) || 0)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            <Accordion type="multiple" defaultValue={['marketing', 'admin']} className="w-full">
                              <AccordionItem value="marketing" className="border-horizon">
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex justify-between items-center w-full px-4">
                                    <h3 className="text-lg font-semibold text-horizon-primary">הוצאות שיווק ומכירות</h3>
                                    <Button onClick={(e) => { e.stopPropagation(); addDetailedExpense('marketing_sales'); }} size="sm" className="btn-horizon-secondary" disabled={!forecast?.is_editable}>
                                      <Plus className="w-4 h-4 ml-2" /> הוסף הוצאה
                                    </Button>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <Alert className="mb-4 mt-2 mx-4 bg-purple-500/10 border-purple-500/30">
                                    <AlertDescription className="text-right text-purple-300">
                                      <strong>הוצאות מכירות ושיווק:</strong> כלול כאן שיווק דיגיטלי, פרסום, עמלות מכירה, כלים ומערכות.
                                    </AlertDescription>
                                  </Alert>
                                  <div className="space-y-4 pt-4 px-4">
                                    {(detailedExpenses?.marketing_sales || []).map((expense, index) => (
                                      <div key={index} className="p-4 bg-horizon-card/50 rounded-lg space-y-3 border border-horizon">
                                        <div className="flex items-center gap-4">
                                          <Input
                                            placeholder="שם ההוצאה (לדוגמה: פרסום בפייסבוק)"
                                            value={expense.name}
                                            onChange={(e) => handleDetailedExpenseChange('marketing_sales', index, 'name', e.target.value)}
                                            onBlur={() => handleSaveField('detailed_expenses', detailedExpenses)}
                                            className="form-input-horizon flex-grow text-right bg-horizon-card border-horizon"
                                            disabled={!forecast?.is_editable}
                                          />
                                          <Button onClick={() => removeDetailedExpense('marketing_sales', index)} variant="ghost" size="icon" className="text-red-400 hover:bg-red-900/20" disabled={!forecast?.is_editable}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                        {renderMonthlyInputs('marketing_sales', index, expense.monthly_amounts, !forecast?.is_editable)}
                                        <div className="text-right text-sm text-horizon-text font-bold pt-2 border-t border-horizon/30">
                                          סה"כ שנתי: {formatCurrency(expense.amount || 0)}
                                        </div>
                                      </div>
                                    ))}

                                    {(detailedExpenses?.marketing_sales || []).length === 0 && (
                                      <div className="text-center py-6 text-horizon-accent">
                                        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>לא הוספו הוצאות מכירות ושיווק</p>
                                        <p className="text-sm mt-1">הוסף הוצאות כדי לחשב עלויות מדויקות</p>
                                      </div>
                                    )}

                                    {(detailedExpenses?.marketing_sales || []).length > 0 && (
                                      <div className="border-t border-horizon pt-4 mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="text-center p-3 bg-horizon-card/30 rounded-lg">
                                            <div className="text-xl font-bold text-horizon-text">
                                              {formatCurrency(((detailedExpenses?.marketing_sales || []).reduce((sum, item) => sum + (item.amount || 0), 0) / 12) || 0)}
                                            </div>
                                            <div className="text-sm text-horizon-accent">סה״כ חודשי ממוצע</div>
                                          </div>
                                          <div className="text-center p-3 bg-horizon-card/30 rounded-lg">
                                            <div className="text-xl font-bold text-purple-400">
                                              {formatCurrency((detailedExpenses?.marketing_sales || []).reduce((sum, item) => sum + (item.amount || 0), 0))}
                                            </div>
                                            <div className="text-sm text-horizon-accent">סה״כ שנתי</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="admin" className="border-horizon">
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex justify-between items-center w-full px-4">
                                    <h3 className="text-lg font-semibold text-horizon-primary">הוצאות הנהלה וכלליות</h3>
                                    <Button onClick={(e) => { e.stopPropagation(); addDetailedExpense('admin_general'); }} size="sm" className="btn-horizon-secondary" disabled={!forecast?.is_editable}>
                                      <Plus className="w-4 h-4 ml-2" /> הוסף הוצאה
                                    </Button>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <Alert className="mb-4 mt-2 mx-4 bg-orange-500/10 border-orange-500/30">
                                    <AlertDescription className="text-right text-orange-300">
                                      <strong>הוצאות הנהלה וכלליות:</strong> כלול כאן שכירות, חשמל, טלפון, מערכות מחשב, ביטוחים, יעוץ מקצועי.
                                    </AlertDescription>
                                  </Alert>
                                  <div className="space-y-4 pt-4 px-4">
                                    {(detailedExpenses?.admin_general || []).map((expense, index) => (
                                      <div key={index} className="p-4 bg-horizon-card/50 rounded-lg space-y-3 border border-horizon">
                                        <div className="flex items-center gap-4">
                                          <Input
                                            placeholder="שם ההוצאה (לדוגמה: שכירות משרד)"
                                            value={expense.name}
                                            onChange={(e) => handleDetailedExpenseChange('admin_general', index, 'name', e.target.value)}
                                            onBlur={() => handleSaveField('detailed_expenses', detailedExpenses)}
                                            className="form-input-horizon flex-grow text-right bg-horizon-card border-horizon"
                                            disabled={!forecast?.is_editable}
                                          />
                                          <Button onClick={() => removeDetailedExpense('admin_general', index)} variant="ghost" size="icon" className="text-red-400 hover:bg-red-900/20" disabled={!forecast?.is_editable}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                        {renderMonthlyInputs('admin_general', index, expense.monthly_amounts, !forecast?.is_editable)}
                                        <div className="text-right text-sm text-horizon-text font-bold pt-2 border-t border-horizon/30">
                                          סה"כ שנתי: {formatCurrency(expense.amount || 0)}
                                        </div>
                                      </div>
                                    ))}

                                    {(detailedExpenses?.admin_general || []).length === 0 && (
                                      <div className="text-center py-6 text-horizon-accent">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>לא הוספו הוצאות הנהלה וכלליות</p>
                                        <p className="text-sm mt-1">הוסף הוצאות כדי לחשב עלויות מדויקות</p>
                                      </div>
                                    )}

                                    {(detailedExpenses?.admin_general || []).length > 0 && (
                                      <div className="border-t border-horizon pt-4 mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="text-center p-3 bg-horizon-card/30 rounded-lg">
                                            <div className="text-xl font-bold text-horizon-text">
                                              {formatCurrency(((detailedExpenses?.admin_general || []).reduce((sum, item) => sum + (item.amount || 0), 0) / 12) || 0)}
                                            </div>
                                            <div className="text-sm text-horizon-accent">סה״כ חודשי ממוצע</div>
                                          </div>
                                          <div className="text-center p-3 bg-horizon-card/30 rounded-lg">
                                            <div className="text-xl font-bold text-orange-400">
                                              {formatCurrency((detailedExpenses?.admin_general || []).reduce((sum, item) => sum + (item.amount || 0), 0))}
                                            </div>
                                            <div className="text-sm text-horizon-accent">סה״כ שנתי</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
              ) : (
                !isLoading && forecasts.length > 0 && <Card className="card-horizon p-8 text-center"><p className="text-horizon-accent">בחר תוכנית להצגה מרשימת התוכניות שלך משמאל.</p></Card>
              )}
            </div>
          </div>
        )}

        {showStrategicInput && (
          <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
            <StrategicPlanInputForm
              customerEmail={customer.email}
              onFormSubmit={handleStrategicInputSubmit}
              existingInput={existingStrategicInput}
              onClose={handleCancelFullGeneration}
              title="הזן נתונים אסטרטגיים ליצירת התחזית"
              description="פרטים אלו יעזרו ל-AI ליצור תחזית מותאמת אישית."
              submitButtonText="המשך ליצירת תחזית"
              selectedForecastType={pendingForecastType}
            />
          </div>
        )}

        {showBusinessPlanModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
            <Card className="card-horizon w-full max-w-4xl h-[90vh] flex flex-col">
              <CardHeader className="flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-xl text-horizon-text">תוכנית עסקית במלל</CardTitle>
                  <CardDescription className="text-horizon-accent">תוכנית שנוצרה על ידי AI עבור {forecast?.forecast_name}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {isEditingPlan ? (
                    <Button onClick={handleSavePlan} disabled={isSavingPlan} className="btn-horizon-primary">
                      {isSavingPlan ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                      שמור שינויים
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setIsEditingPlan(true)} className="border-horizon-accent text-horizon-accent">
                      <Edit className="w-4 h-4 ml-2" />
                      ערוך
                    </Button>
                  )}
                  <Button onClick={generatePdfReport} disabled={isGenerating || !forecast} className="btn-horizon-secondary">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        מייצא PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 ml-2" />
                        ייצא תוכנית ל-PDF
                      </>
                    )}
                  </Button>
                  <Button
                      onClick={generateTextPlan}
                      disabled={!forecast || isGenerating}
                      className="btn-horizon-secondary gap-2"
                  >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                       צור תוכנית עסקית במלל (AI)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto prose prose-invert max-w-none text-right">
                {isEditingPlan ? (
                  <Textarea
                    className="w-full h-full min-h-[500px] bg-horizon-card border-horizon text-horizon-text text-base p-4"
                    value={editedPlanText}
                    onChange={(e) => setEditedPlanText(e.target.value)}
                    dir="rtl"
                  />
                ) : (
                  <ReactMarkdown className="text-horizon-text leading-relaxed">
                    {businessPlanText || "לא נוצרה תוכנית עסקית עדיין."}
                  </ReactMarkdown>
                )}
              </CardContent>
              <div className="p-4 border-t border-horizon text-right">
                <Button variant="ghost" onClick={() => setShowBusinessPlanModal(false)}>סגור</Button>
              </div>
            </Card>
          </div>
        )}

        <Dialog open={showFullForecastGeneration} onOpenChange={setShowFullForecastGeneration}>
          <DialogContent className="sm:max-w-[500px] bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right text-horizon-primary">יצירת תוכנית עסקית מלאה</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-right">
              <p className="text-horizon-accent">
                המערכת תיצור תוכנית עסקית מקיפה עבור "{forecastToComplete?.forecast_name}"
                על בסיס המוצרים המסונכרנים והנתונים האסטרטגיים שתספק.
              </p>

              <div className="space-y-3">
                <p className="font-medium text-horizon-text">בחר סוג תחזית:</p>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => handleFullForecastTypeSelection('optimistic')}
                    className="btn-horizon-secondary w-full text-right justify-start p-4 h-auto"
                  >
                    <div>
                      <div className="font-medium">תחזית אופטימית</div>
                      <div className="text-sm opacity-90">גידול 15-25% במכירות, תחזיות צמיחה</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleFullForecastTypeSelection('pessimistic')}
                    className="btn-horizon-outline w-full text-right justify-start p-4 h-auto"
                  >
                    <div>
                      <div className="font-medium">תחזית פסימית</div>
                      <div className="text-sm opacity-90">גידול 5-10% במכירות, תחזיות זהירות</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-3">
              <Button onClick={handleCancelFullGeneration} variant="outline">
                ביטול
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showInitialCreationModal} onOpenChange={setShowInitialCreationModal}>
          <DialogContent className="sm:max-w-[500px] bg-horizon-dark border-horizon" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-horizon-text text-right">יצירת תוכנית עסקית חדשה</DialogTitle>
              <DialogDescription className="text-horizon-accent text-right">
                הזן פרטים בסיסיים ובחר קטלוג מוצרים לסנכרון.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="forecast-name" className="text-right text-horizon-text">שם התוכנית</Label>
                <Input
                  id="forecast-name"
                  value={newForecastNameInput}
                  onChange={(e) => setNewForecastNameInput(e.target.value)}
                  placeholder="לדוגמה: 'תחזית 2025 - אופטימית'"
                  className="bg-horizon-card border-horizon text-white text-right"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="forecast-year" className="text-right text-horizon-text">שנת התחזית</Label>
                <Input
                  id="forecast-year"
                  type="number"
                  value={newForecastYearInput}
                  onChange={(e) => setNewForecastYearInput(parseInt(e.target.value) || new Date().getFullYear())}
                  className="bg-horizon-card border-horizon text-white text-right"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="catalog-select" className="text-right text-horizon-text">בחר קטלוג לסנכרון מוצרים</Label>
                <Select
                  value={selectedCatalogToSync?.id || ''}
                  onValueChange={(catalogId) => {
                    const selected = catalogs.find(c => c.id === catalogId);
                    setSelectedCatalogToSync(selected);
                  }}
                  disabled={catalogs.length === 0}
                >
                  <SelectTrigger className="bg-horizon-card border-horizon text-white text-right">
                    <SelectValue placeholder={catalogs.length > 0 ? "בחר קטלוג..." : "טוען קטלוגים / אין קטלוגים זמינים"} />
                  </SelectTrigger>
                  <SelectContent className="bg-horizon-card border-horizon">
                    {catalogs.map(catalog => (
                      <SelectItem key={catalog.id} value={catalog.id}>{catalog.catalog_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {catalogs.length === 0 && (
                  <p className="text-xs text-red-400 text-right mt-1">
                    לא נמצאו קטלוגים. אנא וודא שהועלו מוצרים לקטלוגים קיימים או צור קטלוג חדש.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-3">
              <Button onClick={() => setShowInitialCreationModal(false)} variant="outline">
                ביטול
              </Button>
              <Button
                onClick={handleInitialForecastDetailsSubmit}
                disabled={!newForecastNameInput.trim() || !selectedCatalogToSync || catalogs.length === 0 || isGenerating}
                className="btn-horizon-primary"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ArrowLeft className="w-4 h-4 ml-2" />}
                הבא
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}