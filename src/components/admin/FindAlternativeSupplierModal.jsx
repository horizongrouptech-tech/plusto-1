import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Keep Textarea import even if not used directly in form, might be used elsewhere or for future expansions
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { Loader2, SearchCheck, ExternalLink, Plus } from 'lucide-react';

import { toast } from "sonner";
export default function FindAlternativeSupplierModal({ isOpen, onClose, customerEmail, currentUser, onSupplierAdded }) {
  // Original state variables removed/replaced: searchQuery, additionalDetails
  const [formData, setFormData] = useState({
    searchQuery: '',
    category: '',
    currentSupplierName: '', // New field based on outline
  });
  const [error, setError] = useState(null); // New state for errors
  const [currentStep, setCurrentStep] = useState(''); // New state for progress messages
  const [progress, setProgress] = useState(0); // New state for progress percentage
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [addingSupplierIds, setAddingSupplierIds] = useState(new Set());

  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSearch = async () => { // Changed signature from (e) to () based on outline
    console.log("handleSearch function called."); // Add initial log

    if (!formData.searchQuery.trim()) {
      setError('נא להזין מונחי חיפוש');
      return;
    }
    if (!formData.category.trim()) {
      setError('נא לבחור קטגוריה');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults(null); // Changed from [] to null based on outline
    setCurrentStep('מתחיל חיפוש ספקים חלופיים...');
    setProgress(10);

    try {
      console.log("Attempting to invoke findAlternativeSuppliersOnline with formData:", formData, "customerEmail:", customerEmail); // Add log before calling
      
      const { data, error: backendError } = await base44.functions.invoke('findAlternativeSuppliersOnline', {
        customer_email: customerEmail,
        search_query: formData.searchQuery,
        category: formData.category,
        current_supplier_name: formData.currentSupplierName
      });

      console.log("Received response from backend:", { data, backendError }); // Add log after calling

      if (backendError) {
        throw new Error(backendError.message || 'שגיאה בפונקציית השרת.');
      }

      if (data.success) { // New success check based on outline
        setSearchResults(data.suppliers || []);
        setCurrentStep('חיפוש הושלם בהצלחה!');
        setProgress(100);
      } else {
        throw new Error(data.error || 'חיפוש ספקים נכשל.'); // New error handling based on outline
      }
    } catch (err) {
      console.error("Error in handleSearch:", err); // Ensure error log is present
      setError(err.message || 'שגיאה במהלך החיפוש. אנא נסה שוב.');
      setCurrentStep(`שגיאה: ${err.message}`);
      setSearchResults([]); // Reset search results on error
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSupplier = async (supplierData) => {
    // וולידציה קריטית
    if (!customerEmail) {
      toast.error('שגיאה: לא ניתן ליצור ספק ללא שיוך ללקוח');
      return;
    }

    const tempId = `${supplierData.name}-${Date.now()}`;
    setAddingSupplierIds(prev => new Set([...prev, tempId]));
    
    try {
      await base44.entities.Supplier.create({
        name: supplierData.name,
        contact_person: supplierData.contact_person || 'לא צוין',
        phone: supplierData.phone || 'לא צוין',
        email: supplierData.email || '',
        category: supplierData.category || 'כללי',
        website_url: supplierData.website_url || '',
        notes: supplierData.description || '',
        source: 'internet_search',
        is_active: true,
        added_by_full_name: currentUser?.full_name || currentUser?.email,
        customer_emails: [customerEmail],
        created_for_customer_email: customerEmail
      });
      
      toast.success(`הספק "${supplierData.name}" נוסף בהצלחה ושויך ללקוח!`);
      
      setSearchResults(prev => prev.filter(s => s.name !== supplierData.name));
      
      if (onSupplierAdded) {
        onSupplierAdded();
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('שגיאה בהוספת הספק: ' + error.message);
    } finally {
      setAddingSupplierIds(prev => {
        const updated = new Set(prev);
        updated.delete(tempId);
        return updated;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-horizon-primary flex items-center gap-2">
            <SearchCheck className="w-6 h-6" />
            מצא ספק חלופי באינטרנט
          </DialogTitle>
          <DialogDescription className="text-horizon-accent">
            חפש ספקים רלוונטיים באינטרנט והוסף אותם למערכת
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4 mt-4"> {/* Added e.preventDefault() back to form submit */}
          <div>
            <Label htmlFor="searchQuery" className="text-horizon-text">מונחי חיפוש *</Label>
            <Input
              id="searchQuery"
              value={formData.searchQuery}
              onChange={handleFormChange}
              className="bg-horizon-card border-horizon text-horizon-text"
              placeholder='לדוגמה: "ספק ירקות אורגניים", "מנקה משרדים"'
              required
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-horizon-text">קטגוריית ספק *</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={handleFormChange}
              className="bg-horizon-card border-horizon text-horizon-text"
              placeholder='לדוגמה: "ירקות ופירות", "שירותי ניקיון", "אריזות"'
              required
            />
          </div>

          <div>
            <Label htmlFor="currentSupplierName" className="text-horizon-text">שם ספק נוכחי (אופציונלי)</Label>
            <Input
              id="currentSupplierName"
              value={formData.currentSupplierName}
              onChange={handleFormChange}
              className="bg-horizon-card border-horizon text-horizon-text"
              placeholder='לדוגמה: "ספק ירקות העמק"'
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Button type="submit" disabled={isSearching} className="w-full btn-horizon-primary">
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מחפש ספקים באינטרנט...
              </>
            ) : (
              <>
                <SearchCheck className="w-4 h-4 ml-2" />
                חפש ספקים
              </>
            )}
          </Button>
        </form>

        {isSearching && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-horizon-primary" />
            <p className="text-horizon-accent">{currentStep || 'סורק את האינטרנט למציאת ספקים רלוונטיים...'}</p> {/* Use currentStep for messages */}
            {progress > 0 && progress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                <div className="bg-horizon-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            )}
            <p className="text-sm text-horizon-accent mt-2">זה עשוי לקחת כמה שניות</p>
          </div>
        )}

        {!isSearching && searchResults && searchResults.length > 0 && ( // Check if searchResults is not null and has length
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-horizon-text mb-4">נמצאו {searchResults.length} ספקים:</h3>
            
            {searchResults.map((supplier, index) => (
              <Card key={index} className="bg-horizon-card border-horizon">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-horizon-text">{supplier.name}</CardTitle>
                      {supplier.category && (
                        <Badge className="mt-2 bg-indigo-100 text-indigo-800">
                          {supplier.category}
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => handleAddSupplier(supplier)}
                      // Note: The tempId creation ``${supplier.name}-${Date.now()}` ensures a unique ID per render.
                      // This means `addingSupplierIds.has` will only return true immediately after click, before re-render.
                      // For a stable disabled state, a stable ID should be used (e.g., supplier.id if available, or just supplier.name if unique)
                      disabled={addingSupplierIds.has(`${supplier.name}-${Date.now()}`)} // Preserving original logic
                      className="btn-horizon-primary"
                      size="sm">
                      {addingSupplierIds.has(`${supplier.name}-${Date.now()}`) ? ( // Preserving original logic
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          מוסיף...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 ml-2" />
                          הוסף למערכת
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {supplier.description && (
                    <p className="text-horizon-accent text-sm">{supplier.description}</p>
                  )}
                  <div className="flex gap-4 text-sm">
                    {supplier.phone && (
                      <span className="text-horizon-accent">
                        📞 {supplier.phone}
                      </span>
                    )}
                    {supplier.website_url && (
                      <a
                        href={supplier.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-horizon-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        אתר אינטרנט
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}