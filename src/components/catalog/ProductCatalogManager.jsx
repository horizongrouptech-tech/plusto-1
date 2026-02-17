import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package,
  Upload,
  Download,
  Trash2,
  Plus,
  Search,
  CheckCircle,
  Bot,
  RefreshCw,
  X,
  AlertTriangle,
  List,
  Edit3,
  Star
} from "lucide-react";
import { ProductCatalog } from "@/entities/ProductCatalog";
import ProductCatalogUpload from "./ProductCatalogUpload";
import ProductCatalogTable from "./ProductCatalogTable";
import ProductCatalogAutoGenerator from "./ProductCatalogAutoGenerator";
import ManualProductManagement from "./ManualProductManagement";
import ProductEditModal from "./ProductEditModal";
import CatalogDeletionModal from "./CatalogDeletionModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { base44 } from '@/api/base44Client';
import { cleanCatalogSmartly } from "@/functions/cleanCatalogSmartly";
import { toast } from 'sonner';
import { processCatalogUpload } from "@/functions/processCatalogUpload";
import { cancelCatalogGeneration } from "@/functions/cancelCatalogGeneration";
import { UploadFile } from "@/integrations/Core";
import { ProcessStatus } from '@/entities/ProcessStatus';
import CatalogProgressTracker from "./CatalogProgressTracker";
import CatalogGenerationProgressBar from "./CatalogGenerationProgressBar";
import CatalogUploadProgressCard from "./CatalogUploadProgressCard";
import SetDefaultCatalogButton from "../admin/SetDefaultCatalogButton";

import { Catalog } from "@/entities/Catalog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductAddForm from "./ProductAddForm";
import CatalogAnalyticsDashboard from "../analytics/CatalogAnalyticsDashboard";

const CatalogCreationFormModal = ({ isOpen, onClose, onSubmit }) => {
  const [catalogName, setCatalogName] = useState('');

  const handleSubmit = () => {
    if (catalogName.trim()) {
      onSubmit(catalogName.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] dir-rtl bg-horizon-dark border-horizon">
        <DialogHeader>
          <DialogTitle className="text-horizon-text">צור קטלוג חדש</DialogTitle>
          <DialogDescription className="text-horizon-accent text-right">
            הזן שם עבור הקטלוג החדש שלך.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="שם הקטלוג (לדוגמה: 'קטלוג 2024', 'מוצרי ניקוי')"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
            className="bg-horizon-card border-horizon text-horizon-text"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="border-horizon text-horizon-text">
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={!catalogName.trim()}>
            צור קטלוג
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


const trackActivity = (email, eventName, data) => {
  console.log(`Activity tracked for ${email}: ${eventName}`, data);
};

export default function ProductCatalogManager({ customer, isAdmin = false }) {
  const [catalogs, setCatalogs] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState(null);

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTermDebounced, setSearchTermDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [catalogStats, setCatalogStats] = useState({
    total: 0,
    complete: 0,
    incomplete: 0,
    needsReview: 0,
    recommended: 0,
    suggested: 0,
    missingCost: 0
  });
  const [activeTab, setActiveTab] = useState("catalog");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningStatus, setCleaningStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [cleaningResults, setCleaningResults] = useState(null);
  const [isCleanResultsOpen, setIsCleanResultsOpen] = useState(false);
  
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const [processCheckInterval, setProcessCheckInterval] = useState(null);
  const [activeProcessId, setActiveProcessId] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProcessId, setGenerationProcessId] = useState(null);

  const [showCreateCatalogModal, setShowCreateCatalogModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const [catalogGenerationProcessId, setCatalogGenerationProcessId] = useState(null);
  const [catalogGenerationStatus, setCatalogGenerationStatus] = useState(null);
  const [selectedCatalogName, setSelectedCatalogName] = useState('');
  const [isRefreshingProgress, setIsRefreshingProgress] = useState(false);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);

  const [uploadProgressCardData, setUploadProgressCardData] = useState(null);
  const [isRefreshingUploadProgress, setIsRefreshingUploadProgress] = useState(false);

  const updateCatalogStats = useCallback(async () => {
    if (!selectedCatalogId) {
      setCatalogStats({ total: 0, complete: 0, incomplete: 0, needsReview: 0, recommended: 0, suggested: 0, missingCost: 0 });
      return;
    }

    const total = catalogs.find(c => c.id === selectedCatalogId)?.product_count ?? 0;

    try {
      const { data, error } = await base44.functions.invoke('getCatalogStats', { catalog_id: selectedCatalogId });
      if (error) {
        console.error('Error updating catalog stats:', error);
        return;
      }
      if (data) {
        setCatalogStats({ total, ...data });
      }
    } catch (error) {
      console.error('Error updating catalog stats:', error);
    }
  }, [selectedCatalogId, catalogs]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const PRODUCTS_PER_PAGE = 100;

  const loadCatalog = useCallback(async (pageNum = 1) => {
    if (!selectedCatalogId) {
        setIsLoading(false);
        return;
    }
    try {
      setIsLoading(true);
      const skip = (pageNum - 1) * PRODUCTS_PER_PAGE;
      
      const filterQuery = {
        customer_email: customer.email,
        catalog_id: selectedCatalogId,
        is_active: true
      };

      // Add category filter if set
      if (categoryFilter !== 'all') {
        filterQuery.category = categoryFilter;
      }

      // Add quality filter if set
      if (qualityFilter === 'missing_cost') {
        filterQuery.cost_price = { $lte: 0 };
      } else if (qualityFilter === 'needs_review') {
        filterQuery.needs_review = true;
      } else if (qualityFilter !== 'all') {
        filterQuery.data_quality = qualityFilter;
      }

      // Add source filter
      if (sourceFilter === 'ai_suggested') {
        // Use separate fields instead of $or to avoid conflicts
        filterQuery.is_suggested = true;
      } else if (sourceFilter === 'existing') {
        filterQuery.is_suggested = { $ne: true };
        filterQuery.is_recommended = { $ne: true };
      }

      // חיפוש על כל הקטלוג (שרת) – התאמה בשם, ברקוד, ספק, קטגוריה, קוד פריט
      const term = searchTermDebounced.trim();
      if (term) {
        filterQuery.$or = [
          { product_name: { $contains: term } },
          { barcode: { $contains: term } },
          { supplier: { $contains: term } },
          { category: { $contains: term } },
          { supplier_item_code: { $contains: term } }
        ];
      }

      if (term) {
        // כמו חיפוש השירותים בתחזית: טוענים את כל התוצאות batches
        const allResults = [];
        let offset = 0;
        const batchSize = 5000;
        let hasMore = true;
        while (hasMore) {
          const batch = await ProductCatalog.filter(
            filterQuery,
            '-created_date',
            batchSize,
            offset
          );
          allResults.push(...batch);
          offset += batch.length;
          if (batch.length < batchSize) hasMore = false;
        }
        setProducts(allResults);
        setFilteredProducts(allResults);
        setTotalProducts(allResults.length);
        setCurrentPage(1);
      } else {
        const batch = await ProductCatalog.filter(
          filterQuery,
          '-created_date',
          PRODUCTS_PER_PAGE,
          skip
        );
        setProducts(batch);
        setFilteredProducts(batch);
        setCurrentPage(pageNum);
        const selectedCatalog = catalogs.find(c => c.id === selectedCatalogId);
        if (selectedCatalog?.product_count) {
          setTotalProducts(selectedCatalog.product_count);
        } else {
          if (batch.length === PRODUCTS_PER_PAGE) {
            setTotalProducts((pageNum * PRODUCTS_PER_PAGE) + 1);
          } else {
            setTotalProducts((pageNum - 1) * PRODUCTS_PER_PAGE + batch.length);
          }
        }
      }
      
      // עדכון סטטיסטיקות לכל הקטלוג (לא רק העמוד הנוכחי)
      await updateCatalogStats();
    } catch (error) {
      console.error("Error loading catalog:", error);
    } finally {
      setIsLoading(false);
    }
  }, [customer.email, selectedCatalogId, categoryFilter, qualityFilter, sourceFilter, searchTermDebounced, updateCatalogStats, catalogs]);



  const loadCatalogs = useCallback(async () => {
      try {
          setIsLoading(true);
          const fetchedCatalogs = await Catalog.filter({ customer_email: customer.email }, "-created_date");
          setCatalogs(fetchedCatalogs);
          if (fetchedCatalogs.length > 0) {
              const initialSelectedId = selectedCatalogId && fetchedCatalogs.some(c => c.id === selectedCatalogId) 
                                        ? selectedCatalogId 
                                        : fetchedCatalogs[0].id;
              setSelectedCatalogId(initialSelectedId);
              
              const selectedCatalog = fetchedCatalogs.find(c => c.id === initialSelectedId);
              setSelectedCatalogName(selectedCatalog?.catalog_name || '');
          } else {
              setSelectedCatalogId(null);
              setSelectedCatalogName('');
          }
      } catch (error) {
          console.error("Error loading catalogs:", error);
      } finally {
          setIsLoading(false);
      }
  }, [customer.email, selectedCatalogId, setCatalogs, setIsLoading, setSelectedCatalogId, setSelectedCatalogName]);

  const startProgressTracking = useCallback(async (processId, processType) => {
    if (processCheckInterval) {
      clearInterval(processCheckInterval);
    }
    setActiveProcessId(processId);
    setUploadProgressCardData({
      processId,
      processType,
      progress: 0,
      currentStep: 'מתחיל...',
      status: 'running',
      errorMessage: null,
      resultData: null,
      catalogName: selectedCatalogName,
    });

    const interval = setInterval(async () => {
      try {
        const process = await ProcessStatus.get(processId);

        if (!process || process.status !== 'running') {
          clearInterval(interval);
          setProcessCheckInterval(null);
          setActiveProcessId(null);

          const finalStatus = process?.status || 'failed';
          const finalData = {
            processId,
            processType,
            progress: finalStatus === 'completed' ? 100 : process?.progress || 0,
            currentStep: process?.current_step || '',
            status: finalStatus,
            errorMessage: process?.error_message || null,
            resultData: process?.result_data || null,
            catalogName: selectedCatalogName,
          };
          setUploadProgressCardData(finalData);
          setProcessingStatus(finalData.currentStep || (finalStatus === 'completed' ? 'הושלם!' : 'נכשל'));
          setProgress(finalData.progress);
          setIsProcessing(false);
          setIsCleaning(false);

          if (finalStatus === 'completed') {
            if (processType === 'upload') {
              await loadCatalogs();
              if (process.result_data?.catalog_id) {
                setSelectedCatalogId(process.result_data.catalog_id);
              }
            } else {
              setCleaningResults(process.result_data);
              setIsCleanResultsOpen(true);
            }
            await loadCatalog(1);
          }
          return;
        }

        const step = process.current_step || 'מעבד...';
        const prog = process.progress || 0;
        if (processType === 'upload') {
          setProcessingStatus(step);
          setProgress(prog);
        } else {
          setCleaningStatus(step);
          setProgress(prog);
        }
        setUploadProgressCardData(prev => prev ? { ...prev, progress: prog, currentStep: step, status: 'running' } : null);

      } catch (error) {
        console.error("Error tracking progress:", error);
        clearInterval(interval);
        setProcessCheckInterval(null);
        setActiveProcessId(null);
        setUploadProgressCardData(prev => prev ? { ...prev, status: 'failed', errorMessage: error?.message || 'שגיאה בבדיקת סטטוס' } : null);
      }
    }, 3000);

    setProcessCheckInterval(interval);
  }, [
    processCheckInterval,
    selectedCatalogName,
    setActiveProcessId,
    setProcessCheckInterval,
    setProcessingStatus,
    setProgress,
    setIsProcessing,
    setIsCleaning,
    setCleaningStatus,
    setCleaningResults,
    setIsCleanResultsOpen,
    loadCatalog,
    loadCatalogs,
    setSelectedCatalogId
  ]);

  const checkForActiveProcesses = useCallback(async () => {
    if (!customer?.email || !selectedCatalogId) return;

    try {
        const runningProcesses = await ProcessStatus.filter({
            customer_email: customer.email,
            catalog_id: selectedCatalogId,
            process_type: { $in: ['catalog_upload', 'catalog_cleaning'] },
            status: 'running',
        });

        const now = new Date();
        const TIMEOUT_MINUTES = 20;
        let activeProcessFound = false;

        runningProcesses.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

        for (const process of runningProcesses) {
            const startedAt = new Date(process.started_at);
            const minutesSinceStart = (now - startedAt) / (1000 * 60);

            if (minutesSinceStart > TIMEOUT_MINUTES) {
                console.warn(`Process ${process.id} for catalog ${selectedCatalogId} is stuck. Marking as failed.`);
                try {
                  await ProcessStatus.update(process.id, {
                      status: 'failed',
                      error_message: 'התהליך נתקע ועבר את מגבלת הזמן.',
                      completed_at: now.toISOString(),
                  });
                } catch(e) { console.error("Could not update stuck process:", e)}
                continue;
            }

            activeProcessFound = true;

            if (process.process_type === 'catalog_generation') {
                setIsGenerating(true);
                setGenerationProcessId(process.id);
            } else if (process.process_type === 'catalog_upload') {
                 setActiveProcessId(process.id);
                 setIsProcessing(true);
                 setProcessingStatus(process.current_step || 'מעבד...');
                 setProgress(process.progress || 0);
                 setUploadProgressCardData({
                   processId: process.id,
                   processType: 'upload',
                   progress: process.progress || 0,
                   currentStep: process.current_step || 'מעבד...',
                   status: 'running',
                   errorMessage: null,
                   resultData: null,
                   catalogName: selectedCatalogName,
                 });
                 startProgressTracking(process.id, 'upload');
            } else if (process.process_type === 'catalog_cleaning') {
                 setActiveProcessId(process.id);
                 setIsCleaning(true);
                 setCleaningStatus(process.current_step || 'מנקה...');
                 setProgress(process.progress || 0);
                 setUploadProgressCardData({
                   processId: process.id,
                   processType: 'cleaning',
                   progress: process.progress || 0,
                   currentStep: process.current_step || 'מנקה...',
                   status: 'running',
                   errorMessage: null,
                   resultData: null,
                   catalogName: selectedCatalogName,
                 });
                 startProgressTracking(process.id, 'cleaning');
            }
            break;
        }

        if (!activeProcessFound) {
            setIsGenerating(false);
            setGenerationProcessId(null);
            setIsProcessing(false);
            setIsCleaning(false);
            if (processCheckInterval) {
              clearInterval(processCheckInterval);
              setProcessCheckInterval(null);
              setActiveProcessId(null);
            }
        }

    } catch (error) {
      console.error("Error checking active processes:", error);
      setIsGenerating(false);
      setGenerationProcessId(null);
      setIsProcessing(false);
      setIsCleaning(false);
      if (processCheckInterval) {
        clearInterval(processCheckInterval);
        setProcessCheckInterval(null);
        setActiveProcessId(null);
      }
    }
  }, [customer?.email, selectedCatalogId, processCheckInterval, startProgressTracking, setIsGenerating, setGenerationProcessId, setIsProcessing, setProcessingStatus, setProgress, setActiveProcessId, setIsCleaning, setCleaningStatus, setProcessCheckInterval]);

  const checkForActiveCatalogGeneration = useCallback(async () => {
    if (!customer?.email || !selectedCatalogId) return;

    try {
      const runningProcesses = await ProcessStatus.filter({
        customer_email: customer.email,
        catalog_id: selectedCatalogId,
        process_type: 'catalog_generation',
        status: 'running',
      });

      if (runningProcesses.length > 0) {
        const process = runningProcesses[0];
        setCatalogGenerationProcessId(process.id);
        setCatalogGenerationStatus({
          progress: process.progress || 0,
          current_step: process.current_step || 'מתחיל תהליך...',
          status: process.status,
          result_data: process.result_data,
          error_message: process.error_message
        });
        setIsGenerating(true);
        setGenerationProcessId(process.id);
        setCurrentPage(1);
      } else {
        setCatalogGenerationProcessId(null);
        setCatalogGenerationStatus(null);
        setIsGenerating(false);
        setGenerationProcessId(null);
      }
    } catch (error) {
      console.error("Error checking for active catalog generation:", error);
    }
  }, [customer?.email, selectedCatalogId, setCatalogGenerationProcessId, setCatalogGenerationStatus, setIsGenerating, setGenerationProcessId]);

  const handleCheckForActiveCatalogGenerationComplete = useCallback(async () => {
    if (!customer?.email || !selectedCatalogId) return;

    try {
      const runningProcesses = await ProcessStatus.filter({
        customer_email: customer.email,
        catalog_id: selectedCatalogId,
        process_type: 'catalog_generation',
        status: 'running',
      });

      if (runningProcesses.length === 0) {
        setCatalogGenerationProcessId(null);
        setCatalogGenerationStatus(null);
        setIsGenerating(false);
        setGenerationProcessId(null);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Error checking for active catalog generation completion:", error);
    }
  }, [customer?.email, selectedCatalogId, setCatalogGenerationProcessId, setCatalogGenerationStatus, setIsGenerating, setGenerationProcessId]);

  const filterProducts = useCallback(() => {
    let filtered = [...products];
    // כשהחיפוש רץ בשרת (searchTermDebounced לא ריק) – לא מסננים שוב לפי searchTerm
    if (searchTerm && !searchTermDebounced.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.product_name?.toLowerCase().includes(term) ||
        product.barcode?.includes(searchTerm) ||
        product.supplier?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.supplier_item_code?.toLowerCase().includes(term)
      );
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }
    if (qualityFilter !== "all") {
      if (qualityFilter === "missing_cost") {
        filtered = filtered.filter(product => !product.cost_price || product.cost_price === 0);
      } else if (qualityFilter === "needs_review") {
        filtered = filtered.filter(product => product.needs_review === true);
      } else {
        filtered = filtered.filter(product => product.data_quality === qualityFilter);
      }
    }
    if (sourceFilter !== "all") {
      if (sourceFilter === "existing") {
        filtered = filtered.filter(product =>
          !product.is_suggested &&
          product.data_source !== 'ai_suggestion' &&
          !product.is_recommended
        );
      } else if (sourceFilter === "ai_suggested") {
        filtered = filtered.filter(product =>
          product.is_suggested ||
          product.data_source === 'ai_suggestion' ||
          product.is_recommended
        );
      }
    }
    setFilteredProducts(filtered);
  }, [products, searchTerm, searchTermDebounced, categoryFilter, qualityFilter, sourceFilter, setFilteredProducts]);

  useEffect(() => {
    if (customer?.email) {
      loadCatalogs();
    }
  }, [customer?.email, loadCatalogs]);

  // Debounce search term so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTermDebounced(searchTerm);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (selectedCatalogId) {
        setCurrentPage(1);
        loadCatalog(1);
    } else {
        setProducts([]);
        setFilteredProducts([]);
        updateCatalogStats();
        setIsLoading(false);
    }
  }, [selectedCatalogId, categoryFilter, qualityFilter, sourceFilter, searchTermDebounced, loadCatalog, updateCatalogStats]);

  useEffect(() => {
    if (selectedCatalogId && customer?.email) {
        checkForActiveProcesses();
        checkForActiveCatalogGeneration();
    }
  }, [selectedCatalogId, customer?.email, checkForActiveProcesses, checkForActiveCatalogGeneration]);

  useEffect(() => {
    if (!searchTermDebounced.trim()) {
      filterProducts();
    }
  }, [filterProducts, searchTermDebounced]);

  useEffect(() => {
    return () => {
      if (processCheckInterval) {
        clearInterval(processCheckInterval);
      }
    };
  }, [processCheckInterval]);

  const handleCreateCatalog = async (catalogName) => {
      try {
          const newCatalog = await Catalog.create({
              customer_email: customer.email,
              catalog_name: catalogName,
              creation_method: 'manual_entry',
              status: 'active'
          });
          await loadCatalogs();
          setSelectedCatalogId(newCatalog.id);
          setSelectedCatalogName(newCatalog.catalog_name);
          setShowCreateCatalogModal(false);
          trackActivity(customer.email, 'catalog_created', { catalog_id: newCatalog.id, catalog_name: newCatalog.catalog_name });
      } catch (error) {
          console.error("Error creating new catalog:", error);
          toast.error("שגיאה ביצירת קטלוג חדש: " + error.message);
      }
  };

  const handleProductUpdate = async (updatedProduct) => {
    try {
      await ProductCatalog.update(updatedProduct.id, updatedProduct);
      await loadCatalog(currentPage);
      setShowEditModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("שגיאה בעדכון המוצר");
    }
  };

  const handleProductDelete = async (productId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את המוצר?")) return;
    try {
      await ProductCatalog.update(productId, { is_active: false });
      await loadCatalog(currentPage);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("שגיאה במחיקת המוצר");
    }
  };

  const getUniqueCategories = () => {
    const categories = products
      .map(p => p.category)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return categories;
  };

  const exportCatalog = () => {
    const csvContent = [
      ['שם מוצר', 'ברקוד', 'מחיר קנייה', 'מחיר מכירה', 'קטגוריה', 'ספק', 'רווח גולמי', 'אחוז רווח'].join(','),
      ...filteredProducts.map(product => [
        `"${product.product_name || ''}"`,
        `"${product.barcode || ''}"`,
        product.cost_price || 0,
        product.selling_price || 0,
        `"${product.category || ''}"`,
        `"${product.supplier || ''}"`,
        product.gross_profit || 0,
        Math.round(product.profit_percentage || 0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `קטלוג_מוצרים_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    document.body.removeChild(link);
  };

  const handleSmartClean = async () => {
    if (!selectedCatalogId) {
      toast.warning("יש לבחור קטלוג לפני הפעלת ניקוי חכם.");
      return;
    }
    setIsCleaning(true);
    setCleaningStatus('מתחיל תהליך ניקוי...');
    setProgress(0);
    try {
        const { data, error } = await cleanCatalogSmartly({ 
            customer_email: customer.email,
            catalog_id: selectedCatalogId,
            action: 'start' 
        });

        if (error || !data.success) {
            throw new Error(data.error || 'הפעלת תהליך הניקוי נכשלה');
        }
        
        startProgressTracking(data.process_id, 'cleaning');
        trackActivity(customer.email, 'catalog_cleaned_started', { process_id: data.process_id, catalog_id: selectedCatalogId });

    } catch (error) {
        console.error("Error starting smart cleaning:", error);
        setCleaningStatus(`שגיאה: ${error.message}`);
        toast.error("אירעה שגיאה במהלך הניקוי החכם: " + error.message);
        setIsCleaning(false);
        setTimeout(() => {
            setProgress(0);
            setCleaningStatus('');
        }, 3000);
    }
  };

  const handleCancelCleaning = async () => {
      if (!activeProcessId || !selectedCatalogId) return;
      try {
          setIsCleaning(true);
          setCleaningStatus('מבטל תהליך ניקוי...');
          const { data, error } = await cleanCatalogSmartly({
              customer_email: customer.email,
              catalog_id: selectedCatalogId,
              action: 'cancel',
              process_id: activeProcessId
          });
          if (error || !data.success) {
            throw new Error(data.error || 'ביטול תהליך הניקוי נכשל');
          }
          trackActivity(customer.email, 'catalog_cleaning_cancelled', { process_id: activeProcessId, catalog_id: selectedCatalogId });
      } catch(error) {
          console.error("Error cancelling cleaning process:", error);
          toast.error('שגיאה בביטול תהליך הניקוי: ' + error.message);
          setIsCleaning(false);
          setCleaningStatus('');
      }
  };

  const handleUploadAndProcess = async (file) => {
    if (!selectedCatalogId) {
        toast.warning("יש לבחור או ליצור קטלוג תחילה.");
        return;
    }
    setIsProcessing(true);
    setProcessingStatus('מעלה קובץ לשרת...');
    setProgress(10);
    try {
      const uploadResult = await UploadFile({ file });
      const { file_url, error: uploadError } = uploadResult || {};

      if (uploadError) {
        throw new Error(uploadError.message || 'שגיאה בהעלאת קובץ');
      }

      if (!file_url) {
        console.error('UploadFile returned:', uploadResult);
        throw new Error('העלאת הקובץ נכשלה – לא התקבל file_url מהשרת');
      }
      
      setProcessingStatus('הקובץ הועלה. מתחיל עיבוד ברקע...');
      setProgress(20);
      setProcessingStatus('התהליך עלול לקחת מספר דקות בהתאם לגודל הקובץ...');
      setProgress(50);

      const { data: processResult, error: processError } = await processCatalogUpload({
          customer_email: customer.email,
          file_url,
          catalog_id: selectedCatalogId
      });

      if (processError || !processResult.success) {
          throw new Error(processError?.message || processResult.error || 'עיבוד הקובץ נכשל');
      }

      startProgressTracking(processResult.process_id, 'upload');
      trackActivity(customer.email, 'catalog_upload_started', { 
        process_id: processResult.process_id, 
        catalog_id: processResult.catalog_id || selectedCatalogId 
      });

    } catch (error) {
        console.error("Error processing file:", error);
        const errorMessage = error.message || 'שגיאה לא ידועה';
        
        // שמירת הקובץ כנכשל במערכת
        try {
            if (file_url) {
                await base44.entities.FileUpload.create({
                    filename: file?.name || 'קובץ קטלוג',
                    file_url: file_url,
                    file_type: file?.name?.split('.').pop()?.toLowerCase() || 'unknown',
                    status: 'failed',
                    data_category: 'catalog',
                    analysis_notes: errorMessage,
                    error_message: error.message || errorMessage,
                    customer_email: customer?.email
                });
            }
        } catch (saveError) {
            console.error('Error saving failed file record:', saveError);
        }
        
        // הודעה ידידותית למשתמש
        const friendlyMessage = '⚠️ הקובץ לא הועלה בהצלחה\n\nהקובץ הועבר לטיפול מנהל המערכת ונבדק בהקדם.\nתוכל לראות את הסטטוס בעדכונים שיישלחו אליך.';
        setProcessingStatus('הקובץ הועבר לטיפול מנהל המערכת');
        toast.warning(friendlyMessage);
        setIsProcessing(false);
        setTimeout(() => {
            setProgress(0);
            setProcessingStatus('');
        }, 5000);
    }
  };

  const handleDeletionComplete = async (totalDeleted) => {
    trackActivity(customer.email, 'catalog_deleted', { 
      catalog_id: selectedCatalogId,
      products_count: totalDeleted,
      deletion_date: new Date().toISOString()
    });
    
    setShowDeleteConfirmation(false);
    await loadCatalogs();
  };

  const refreshCatalogGenerationStatus = async () => {
    if (!catalogGenerationProcessId) return;

    setIsRefreshingProgress(true);
    try {
      const process = await ProcessStatus.get(catalogGenerationProcessId);
      if (process) {
        setCatalogGenerationStatus({
          progress: process.progress || 0,
          current_step: process.current_step || 'מתחיל תהליך...',
          status: process.status,
          result_data: process.result_data,
          error_message: process.error_message
        });

        if (['completed', 'failed', 'cancelled'].includes(process.status)) {
          setTimeout(() => {
            setCatalogGenerationProcessId(null);
            setCatalogGenerationStatus(null);
            setIsGenerating(false);
            setGenerationProcessId(null);
            loadCatalog(1);
          }, 3000);
        }
      } else {
        setCatalogGenerationProcessId(null);
        setCatalogGenerationStatus(null);
        setIsGenerating(false);
        setGenerationProcessId(null);
      }
    } catch (error) {
      console.error("Error refreshing catalog generation status:", error);
    } finally {
      setIsRefreshingProgress(false);
    }
  };

  const handleCancelCatalogGeneration = async () => {
    if (!catalogGenerationProcessId) return;

    setIsCancellingGeneration(true);
    try {
      const { data, error } = await cancelCatalogGeneration({
        process_id: catalogGenerationProcessId,
        customer_email: customer.email
      });

      if (error || !data.success) {
        throw new Error(data.error || 'ביטול התהליך נכשל');
      }

      await refreshCatalogGenerationStatus();
    } catch (error) {
      console.error("Error cancelling catalog generation:", error);
      toast.error('שגיאה בביטול תהליך יצירת הקטלוג: ' + error.message);
    } finally {
      setIsCancellingGeneration(false);
    }
  };

  const handleGenerationStarted = (processId, catalogName) => {
    setCatalogGenerationProcessId(processId);
    setSelectedCatalogName(catalogName);
    setCatalogGenerationStatus({
      progress: 0,
      current_step: 'מתחיל תהליך יצירת קטלוג...',
      status: 'running'
    });
    setIsGenerating(true);
    setGenerationProcessId(processId);
  };

  const handleNewProductAdded = async (newProduct) => {
    await loadCatalog();
    setShowAddProductModal(false);
  };

  const handleDismissUploadProgress = useCallback(() => {
    setUploadProgressCardData(null);
    setActiveProcessId(null);
    setIsProcessing(false);
    setIsCleaning(false);
    setProcessingStatus('');
    setCleaningStatus('');
    setProgress(0);
    if (processCheckInterval) {
      clearInterval(processCheckInterval);
      setProcessCheckInterval(null);
    }
  }, [processCheckInterval]);

  const handleRefreshUploadProgress = useCallback(async () => {
    const data = uploadProgressCardData;
    if (!data?.processId) return;
    setIsRefreshingUploadProgress(true);
    try {
      const process = await ProcessStatus.get(data.processId);
      if (process) {
        setUploadProgressCardData(prev => prev ? {
          ...prev,
          progress: process.progress || 0,
          currentStep: process.current_step || prev.currentStep,
          status: process.status || prev.status,
          errorMessage: process.error_message || null,
          resultData: process.result_data || null,
        } : null);
        setProcessingStatus(process.current_step || '');
        setProgress(process.progress || 0);
      }
    } catch (e) {
      console.error('Refresh upload progress failed:', e);
    } finally {
      setIsRefreshingUploadProgress(false);
    }
  }, [uploadProgressCardData?.processId]);

  if (isLoading && !products.length && !catalogs.length && customer?.email) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-horizon-primary" />
          <p className="text-horizon-accent">טוען נתונים...</p>
        </CardContent>
      </Card>
    );
  }

  const disableAllActions = isProcessing || isCleaning || isGenerating;
  const noCatalogSelected = !selectedCatalogId;

  return (
    <div className="space-y-6" dir="rtl">
      {uploadProgressCardData && (
        <CatalogUploadProgressCard
          processType={uploadProgressCardData.processType}
          progress={uploadProgressCardData.progress}
          currentStep={uploadProgressCardData.currentStep}
          status={uploadProgressCardData.status}
          errorMessage={uploadProgressCardData.errorMessage}
          resultData={uploadProgressCardData.resultData}
          catalogName={uploadProgressCardData.catalogName}
          onRefresh={handleRefreshUploadProgress}
          onDismiss={handleDismissUploadProgress}
          isRefreshing={isRefreshingUploadProgress}
        />
      )}
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-start flex-wrap gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl text-horizon-text flex items-center gap-2">
                <Package className="w-6 h-6 text-horizon-primary" />
                קטלוג מוצרים חכם
              </CardTitle>
              <p className="text-horizon-accent mt-2">
                ניהול מוצרים מקצועי עם חישובי רווח אוטומטיים
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <List className="w-5 h-5 text-horizon-accent" />
                <Select 
                    value={selectedCatalogId || ''} 
                    onValueChange={(value) => {
                        setSelectedCatalogId(value);
                        const selectedCatalog = catalogs.find(c => c.id === value);
                        setSelectedCatalogName(selectedCatalog?.catalog_name || '');
                    }}
                    disabled={catalogs.length === 0 || disableAllActions}
                >
                    <SelectTrigger className="w-[250px] bg-horizon-card border-horizon text-horizon-text">
                        <SelectValue placeholder="בחר קטלוג..." />
                    </SelectTrigger>
                    <SelectContent>
                        {catalogs.length > 0 ? (
                            catalogs.map(catalog => {
                                // הצגת מספר מוצרים ישירות מישות Catalog
                                const displayCount = catalog.product_count || 0;
                                return (
                                    <SelectItem key={catalog.id} value={catalog.id}>
                                        <div className="flex items-center gap-2">
                                            {catalog.is_default && (
                                                <Badge className="bg-horizon-primary text-white text-xs">רשמי</Badge>
                                            )}
                                            <span>{catalog.catalog_name} ({displayCount.toLocaleString()} מוצרים)</span>
                                        </div>
                                    </SelectItem>
                                );
                            })
                        ) : (
                            <SelectItem value="no-catalogs" disabled>
                                אין קטלוגים...
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
                 <Button onClick={() => setShowCreateCatalogModal(true)} size="sm" disabled={disableAllActions}>
                    <Plus className="w-4 h-4 ml-1" />
                    קטלוג חדש
                </Button>
                {selectedCatalogId && catalogs.find(c => c.id === selectedCatalogId) && (
                 <SetDefaultCatalogButton
                   catalog={catalogs.find(c => c.id === selectedCatalogId)}
                   customerEmail={customer.email}
                   onSuccess={loadCatalogs}
                 />
                )}
            </div>
            
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={isCleaning ? handleCancelCleaning : handleSmartClean}
                disabled={disableAllActions || noCatalogSelected}
                className={`btn-horizon-secondary min-w-[200px] ${isCleaning ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
              >
                {isCleaning ? (
                  <>
                    <X className="w-4 h-4 ml-2" />
                    <span>בטל ניקוי</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 ml-2" />
                    ניקוי קטלוג חכם
                  </>
                )}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const response = await base44.functions.invoke('exportCatalogToExcel', {
                      customer_email: customer.email,
                      catalog_id: selectedCatalogId
                    });
                    if (response.data && typeof response.data === 'string') {
                      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `catalog_${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success('קטלוג יוצא בהצלחה');
                    }
                  } catch (error) {
                    console.error('Export error:', error);
                    toast.error('שגיאה בייצוא לאקסל');
                  }
                }}
                variant="outline"
                size="sm"
                disabled={filteredProducts.length === 0 || disableAllActions || noCatalogSelected}
              >
                <Download className="w-4 h-4 ml-2" />
                יצוא לExcel
              </Button>
              {selectedCatalogId && (
                <Button
                  onClick={() => setShowDeleteConfirmation(true)}
                  variant="destructive"
                  size="sm"
                  disabled={disableAllActions || noCatalogSelected}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק קטלוג
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedCatalogId ? (
            (() => {
              const catalogProductCount = catalogs.find(c => c.id === selectedCatalogId)?.product_count ?? 0;
              const cap = (n) => Math.min(n, catalogProductCount);
              return (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <div className="bg-horizon-card/30 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-horizon-text">{catalogProductCount.toLocaleString()}</div>
                <div className="text-sm text-horizon-accent">סה"כ מוצרים</div>
              </div>
              <button type="button" onClick={() => setQualityFilter(qualityFilter === 'complete' ? 'all' : 'complete')} className={`bg-green-500/10 p-4 rounded-lg border transition-all text-right ${qualityFilter === 'complete' ? 'ring-2 ring-green-400 border-green-400' : 'border-green-500/20 hover:bg-green-500/20 cursor-pointer'}`}>
                <div className="text-2xl font-bold text-green-400">{cap(catalogStats.complete).toLocaleString()}</div>
                <div className="text-sm text-green-300">נתונים מלאים</div>
              </button>
              <button type="button" onClick={() => setQualityFilter(qualityFilter === 'incomplete' ? 'all' : 'incomplete')} className={`bg-yellow-500/10 p-4 rounded-lg border transition-all text-right ${qualityFilter === 'incomplete' ? 'ring-2 ring-yellow-400 border-yellow-400' : 'border-yellow-500/20 hover:bg-yellow-500/20 cursor-pointer'}`}>
                <div className="text-2xl font-bold text-yellow-400">{cap(catalogStats.incomplete).toLocaleString()}</div>
                <div className="text-sm text-yellow-300">נתונים חסרים</div>
              </button>
              <button type="button" onClick={() => setQualityFilter(qualityFilter === 'missing_cost' ? 'all' : 'missing_cost')} className={`bg-orange-500/10 p-4 rounded-lg border transition-all text-right ${qualityFilter === 'missing_cost' ? 'ring-2 ring-orange-400 border-orange-400' : 'border-orange-500/20 hover:bg-orange-500/20 cursor-pointer'}`}>
                <div className="text-2xl font-bold text-orange-400">{cap(catalogStats.missingCost).toLocaleString()}</div>
                <div className="text-sm text-orange-300">חסר מחיר קנייה</div>
              </button>
              <button type="button" onClick={() => setQualityFilter(qualityFilter === 'needs_review' ? 'all' : 'needs_review')} className={`bg-red-500/10 p-4 rounded-lg border transition-all text-right ${qualityFilter === 'needs_review' ? 'ring-2 ring-red-400 border-red-400' : 'border-red-500/20 hover:bg-red-500/20 cursor-pointer'}`}>
                <div className="text-2xl font-bold text-red-400">{cap(catalogStats.needsReview).toLocaleString()}</div>
                <div className="text-sm text-red-300">טעון בדיקה</div>
              </button>
              <div className="bg-blue-500/10 p-4 rounded-lg text-center border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400">{catalogStats.recommended.toLocaleString()}</div>
                <div className="text-sm text-blue-300">מומלצים</div>
              </div>
              <div className="bg-purple-500/10 p-4 rounded-lg text-center border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-400">{catalogStats.suggested.toLocaleString()}</div>
                <div className="text-sm text-purple-300">הצעות AI</div>
              </div>
            </div>
              );
            })()
          ) : (
            <div className="text-center py-8">
              <p className="text-horizon-accent">יש לבחור קטלוג או ליצור קטלוג חדש כדי להתחיל.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {catalogGenerationProcessId && catalogGenerationStatus && (
        <CatalogGenerationProgressBar
          processStatus={catalogGenerationStatus}
          catalogName={selectedCatalogName}
          onRefresh={refreshCatalogGenerationStatus}
          onCancel={handleCancelCatalogGeneration}
          isRefreshing={isRefreshingProgress}
          isCancelling={isCancellingGeneration}
        />
      )}

      {isGenerating && generationProcessId && (
        <CatalogProgressTracker 
          processId={generationProcessId}
          onComplete={() => {
            setIsGenerating(false);
            setGenerationProcessId(null);
            loadCatalog();
          }}
          customer={customer}
        />
      )}
      
      {noCatalogSelected && catalogs.length === 0 && !isLoading ? (
          <Card className="card-horizon">
            <CardContent className="p-8 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
              <h3 className="text-xl font-semibold text-horizon-text mb-2">
                אין קטלוגים זמינים
              </h3>
              <p className="text-horizon-accent mb-6">
                צור קטלוג חדש כדי להתחיל לנהל את המוצרים שלך.
              </p>
              <Button onClick={() => setShowCreateCatalogModal(true)} disabled={disableAllActions}>
                <Plus className="w-4 h-4 ml-2" />
                צור קטלוג ראשון
              </Button>
            </CardContent>
          </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-horizon-card">
            <TabsTrigger value="catalog" className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all" disabled={noCatalogSelected}>
              <Package className="w-4 h-4 ml-2" />
              קטלוג קיים
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all" disabled={disableAllActions || noCatalogSelected}>
              <Upload className="w-4 h-4 ml-2" />
              העלאת קובץ
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all" disabled={disableAllActions || noCatalogSelected}>
              <Bot className="w-4 h-4 ml-2" />
              יצירה אוטומטית
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all" disabled={disableAllActions || noCatalogSelected}>
              <Edit3 className="w-4 h-4 ml-2" />
              ניהול ידני
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#32acc1] data-[state=active]:text-white transition-all" disabled={noCatalogSelected}>
              📊 ניתוח ותובנות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog">
            {products.length === 0 && !isLoading && !isGenerating ? (
              <Card className="card-horizon">
                <CardContent className="p-8 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
                  <h3 className="text-xl font-semibold text-horizon-text mb-2">
                    הקטלוג ריק
                  </h3>
                  <p className="text-horizon-accent mb-6">
                    התחל על ידי העלאת קובץ Excel או יצירה אוטומטית של מוצרים לקטלוג זה.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setActiveTab("upload")} disabled={disableAllActions}>
                      <Upload className="w-4 h-4 ml-2" />
                      העלה קובץ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("generate")}
                      disabled={disableAllActions}
                    >
                      <Bot className="w-4 h-4 ml-2" />
                      צור אוטומטית
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="card-horizon">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex-1 min-w-64">
                       <div className="relative">
                         <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                         <Input
                           placeholder="חיפוש לפי שם, ברקוד, ספק, קטגוריה או קוד פריט..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="pr-10 bg-horizon-card border-horizon text-horizon-text"
                           disabled={disableAllActions}
                         />
                         {searchTerm && (
                           <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                             <Badge variant="secondary" className="text-xs">
                               {searchTermDebounced.trim() ? `${totalProducts} תוצאות` : `${filteredProducts.length} תוצאות`}
                             </Badge>
                           </div>
                         )}
                       </div>
                      </div>

                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text overflow-hidden text-ellipsis whitespace-nowrap"
                        disabled={disableAllActions}
                      >
                        <option value="all">כל הקטגוריות</option>
                        {getUniqueCategories().map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>

                      <select
                       value={qualityFilter}
                       onChange={(e) => setQualityFilter(e.target.value)}
                       className="px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text overflow-hidden text-ellipsis whitespace-nowrap"
                       disabled={disableAllActions}
                      >
                        <option value="all">כל איכויות הנתונים</option>
                        <option value="complete">נתונים מלאים</option>
                        <option value="partial">נתונים חלקיים</option>
                        <option value="incomplete">נתונים חסרים</option>
                        <option value="missing_cost">חסר מחיר קנייה</option>
                        <option value="needs_review">טעון בדיקה</option>
                      </select>

                      <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="px-3 py-2 bg-horizon-card border border-horizon rounded-md text-horizon-text overflow-hidden text-ellipsis whitespace-nowrap"
                        disabled={disableAllActions}
                      >
                        <option value="all">כל המוצרים</option>
                        <option value="existing">מוצרים קיימים</option>
                        <option value="ai_suggested">המלצות מערכת</option>
                      </select>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setSearchTermDebounced("");
                          setCategoryFilter("all");
                          setQualityFilter("all");
                          setSourceFilter("all");
                        }}
                        disabled={disableAllActions}
                      >
                        נקה סינונים
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setShowAddProductModal(true)}
                        disabled={disableAllActions || noCatalogSelected}
                        className="btn-horizon-primary"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף מוצר
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <ProductCatalogTable
                   products={searchTermDebounced.trim() ? products.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE) : filteredProducts}
                   onEdit={(product) => {
                     setEditingProduct(product);
                     setShowEditModal(true);
                   }}
                   onDelete={handleProductDelete}
                   isAdmin={isAdmin}
                   disableActions={disableAllActions}
                 />

                {/* Pagination Controls */}
                <Card className="card-horizon">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-horizon-accent">
                        {searchTermDebounced.trim() ? (
                          totalProducts > 0 ? (
                            <>
                              תוצאות חיפוש – מוצרים {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}-{Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts)} מתוך {totalProducts}
                            </>
                          ) : (
                            'לא נמצאו תוצאות חיפוש'
                          )
                        ) : totalProducts > 0 ? (
                          <>
                            מוצרים {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}-{Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts)} מתוך {totalProducts}
                          </>
                        ) : (
                          'לא נמצאו מוצרים'
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => searchTermDebounced.trim() ? setCurrentPage(1) : loadCatalog(1)}
                          disabled={currentPage === 1 || isLoading || disableAllActions}
                          className="border-horizon text-horizon-text"
                        >
                          ראשון
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => searchTermDebounced.trim() ? setCurrentPage(currentPage - 1) : loadCatalog(currentPage - 1)}
                          disabled={currentPage === 1 || isLoading || disableAllActions}
                          className="border-horizon text-horizon-text"
                        >
                          הקודם
                        </Button>
                        <span className="px-4 text-sm font-medium text-horizon-text">
                          {searchTermDebounced.trim() ? (
                            <>דף {currentPage} מתוך {Math.ceil(totalProducts / PRODUCTS_PER_PAGE) || 1}</>
                          ) : (
                            <>דף {currentPage} מתוך {Math.ceil(totalProducts / PRODUCTS_PER_PAGE) || 1}</>
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => searchTermDebounced.trim() ? setCurrentPage(currentPage + 1) : loadCatalog(currentPage + 1)}
                          disabled={currentPage >= Math.ceil(totalProducts / PRODUCTS_PER_PAGE) || isLoading || disableAllActions}
                          className="border-horizon text-horizon-text"
                        >
                          הבא
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => searchTermDebounced.trim() ? setCurrentPage(Math.ceil(totalProducts / PRODUCTS_PER_PAGE)) : loadCatalog(Math.ceil(totalProducts / PRODUCTS_PER_PAGE))}
                          disabled={currentPage >= Math.ceil(totalProducts / PRODUCTS_PER_PAGE) || isLoading || disableAllActions}
                          className="border-horizon text-horizon-text"
                        >
                          אחרון
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <ProductCatalogUpload
              customer={customer}
              selectedCatalogId={selectedCatalogId}
              onUploadComplete={loadCatalog}
              onProcessStarted={startProgressTracking ? (processId) => startProgressTracking(processId, 'upload') : undefined}
              onProcessFile={handleUploadAndProcess}
              isProcessing={isProcessing}
              processingStatus={processingStatus}
              progress={progress}
              disabled={disableAllActions || noCatalogSelected}
            />
          </TabsContent>

          <TabsContent value="generate">
            <ProductCatalogAutoGenerator
              customer={customer}
              onGenerationStart={handleGenerationStarted}
              disabled={disableAllActions}
              selectedCatalogId={selectedCatalogId}
            />
          </TabsContent>

          <TabsContent value="manual">
            <ManualProductManagement
              customer={customer}
              selectedCatalogId={selectedCatalogId}
              disabled={disableAllActions}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <CatalogAnalyticsDashboard
              products={products}
              customer={customer}
              selectedCatalogId={selectedCatalogId}
            />
          </TabsContent>
        </Tabs>
      )}

      {showEditModal && editingProduct && (
        <ProductEditModal
          product={editingProduct}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
          }}
          onSave={handleProductUpdate}
        />
      )}
      
      {showCreateCatalogModal && (
        <CatalogCreationFormModal
            isOpen={showCreateCatalogModal}
            onClose={() => setShowCreateCatalogModal(false)}
            onSubmit={handleCreateCatalog}
        />
      )}

      {showDeleteConfirmation && selectedCatalogId && (
        <CatalogDeletionModal
          isOpen={showDeleteConfirmation}
          onClose={() => setShowDeleteConfirmation(false)}
          catalogId={selectedCatalogId}
          catalogName={catalogs.find(c => c.id === selectedCatalogId)?.catalog_name || 'קטלוג'}
          customerEmail={customer.email}
          initialProductCount={catalogStats.total}
          onDeletionComplete={handleDeletionComplete}
        />
      )}

      {isCleanResultsOpen && cleaningResults && (
        <Dialog open={isCleanResultsOpen} onOpenChange={setIsCleanResultsOpen}>
          <DialogContent className="sm:max-w-[425px] dir-rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="text-green-500" />
                ניקוי קטלוג הושלם בהצלחה!
              </DialogTitle>
              <DialogDescription className="mt-2 text-right">
                להלן סיכום הפעולות שבוצעו:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-right">
              <p className="text-sm">
                <Badge variant="secondary" className="ml-2">
                  {cleaningResults.duplicatesFound || 0}
                </Badge>
                כפילויות שנמצאו
              </p>
              <p className="text-sm">
                <Badge variant="secondary" className="ml-2">
                  {cleaningResults.duplicatesMerged || 0}
                </Badge>
                כפילויות שמוזגו
              </p>
              <p className="text-sm">
                <Badge variant="secondary" className="ml-2">
                  {cleaningResults.pricesFixed || 0}
                </Badge>
                מחירים שתוקנו
              </p>
              <p className="text-sm">
                <Badge variant="secondary" className="ml-2">
                  {cleaningResults.markedRecommended || 0}
                </Badge>
                מוצרים שסומנו כמומלצים
              </p>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setIsCleanResultsOpen(false)}>סגור</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {showAddProductModal && (
        <ProductAddForm
          customer={customer}
          selectedCatalogId={selectedCatalogId}
          onProductAdded={handleNewProductAdded}
          isOpen={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
        />
      )}
    </div>
  );
}