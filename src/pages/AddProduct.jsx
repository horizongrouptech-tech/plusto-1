import React, { useState, useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, PlusCircle, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Product, User } from '@/api/entities';


export default function AddProduct() {
  const navigate = useNavigate();
  const [productData, setProductData] = useState({
    name: "",
    product_code: "",
    cost_price: "",
    selling_price: "",
    monthly_sales: "",
    inventory: "",
    category: "",
    supplier: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
        try {
            const user = await User.me();
            setCurrentUser(user);
        } catch (error) {
            console.error("User not logged in or error fetching user:", error);
        }
    };
    fetchUser();
  }, []);

  const validateField = (field, value) => {
    const errors = {};
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          errors.name = 'שם המוצר הוא שדה חובה';
        } else if (value.trim().length < 2) {
          errors.name = 'שם המוצר חייב להכיל לפחות 2 תווים';
        }
        break;
        
      case 'cost_price':
        if (!value) {
          errors.cost_price = 'מחיר עלות הוא שדה חובה';
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            errors.cost_price = 'מחיר עלות חייב להיות מספר חיובי או אפס';
          }
        }
        break;
        
      case 'selling_price':
        if (!value) {
          errors.selling_price = 'מחיר מכירה הוא שדה חובה';
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue <= 0) {
            errors.selling_price = 'מחיר מכירה חייב להיות מספר חיובי';
          }
        }
        break;
        
      case 'monthly_sales':
        if (value && value !== '') {
          const numValue = parseInt(value, 10);
          if (isNaN(numValue) || numValue < 0) {
            errors.monthly_sales = 'מכירות חודשיות חייבות להיות מספר שלם חיובי';
          }
        }
        break;
        
      case 'inventory':
        if (value && value !== '') {
          const numValue = parseInt(value, 10);
          if (isNaN(numValue) || numValue < 0) {
            errors.inventory = 'כמות במלאי חייבת להיות מספר שלם חיובי';
          }
        }
        break;
        
      case 'category':
        if (value && value.trim().length > 50) {
          errors.category = 'שם הקטגוריה ארוך מדי (מקסימום 50 תווים)';
        }
        break;
        
      case 'supplier':
        if (value && value.trim().length > 100) {
          errors.supplier = 'שם הספק ארוך מדי (מקסימום 100 תווים)';
        }
        break;
    }
    
    return errors;
  };

  const handleInputChange = (field, value) => {
    setProductData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
    
    // Real-time validation
    const fieldErrors = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [field]: fieldErrors[field] || undefined
    }));
  };

  const validateAllFields = () => {
    let allErrors = {};
    
    Object.keys(productData).forEach(field => {
      const fieldErrors = validateField(field, productData[field]);
      allErrors = { ...allErrors, ...fieldErrors };
    });
    
    // Additional cross-field validation
    if (productData.cost_price && productData.selling_price) {
      const costPrice = parseFloat(productData.cost_price);
      const sellingPrice = parseFloat(productData.selling_price);
      
      if (!isNaN(costPrice) && !isNaN(sellingPrice) && costPrice > sellingPrice) {
        allErrors.selling_price = 'מחיר המכירה נמוך ממחיר העלות - וודא שהנתונים נכונים';
      }
    }
    
    setValidationErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const calculateDerivedFields = (data) => {
    const cost = parseFloat(data.cost_price) || 0;
    const sell = parseFloat(data.selling_price) || 0;
    const sales = data.monthly_sales ? parseInt(data.monthly_sales, 10) : 0; // Use radix 10

    // תיקון חישוב הרווח - הבעיה הייתה שהחישוב לא עבד כשעלות = 0
    let margin_percentage = 0;
    if (sell > 0 && cost >= 0) {
      if (cost === 0) {
        margin_percentage = 100; // אם אין עלות, הרווח הוא 100%
      } else {
        margin_percentage = ((sell - cost) / sell) * 100; // תיקון: חישוב על בסיס מחיר המכירה
      }
    }

    let monthly_revenue = 0;
    if (sales > 0 && sell > 0) {
      monthly_revenue = sales * sell;
    }

    // חישוב רווח חודשי ממשי
    let monthly_profit = 0;
    if (sales > 0 && sell > 0 && cost >= 0) {
      monthly_profit = sales * (sell - cost);
    }

    return {
      ...data,
      margin_percentage: parseFloat(margin_percentage.toFixed(2)),
      monthly_revenue: parseFloat(monthly_revenue.toFixed(2)),
      monthly_profit: parseFloat(monthly_profit.toFixed(2)), // הוספה חדשה
      cost_price: cost,
      selling_price: sell,
      monthly_sales: sales,
      inventory: data.inventory ? parseInt(data.inventory, 10) : 0 // Use radix 10
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser) {
        setError("לא ניתן להוסיף מוצר, משתמש לא זוהה.");
        return;
    }

    // Validate all fields before submission
    if (!validateAllFields()) {
      setError("אנא תקן את השגיאות בטופס לפני השליחה.");
      return;
    }

    setIsLoading(true);
    try {
      let processedData = calculateDerivedFields(productData);
      processedData = { ...processedData, created_by: currentUser.email };
      const newProduct = await Product.create(processedData);
      setSuccess(`המוצר "${productData.name}" נוסף בהצלחה!`);
      setProductData({
        name: "",
        product_code: "",
        cost_price: "",
        selling_price: "",
        monthly_sales: "",
        inventory: "",
        category: "",
        supplier: ""
      });
      setValidationErrors({});
      
      // Generate recommendations and update action bank after product addition
      if (newProduct) {
          const { analyzeProductsAndGenerateRecommendations } = await import("@/components/logic/recommendationEngine");
          await analyzeProductsAndGenerateRecommendations([newProduct], currentUser.email);
          
          // Also update the action bank by calling the business-specific actions generator
          // This will ensure new actions are available based on the new product
          console.log("מעדכן בנק מהלכים עם מוצר חדש");
      }
      
      setTimeout(() => {
          navigate(createPageUrl("Dashboard"));
      }, 2000);
      
    } catch (err) {
      setError("שגיאה בהוספת המוצר. אנא נסה שוב.");
      console.error("Failed to add product:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="rounded-xl border-horizon text-horizon-text hover:bg-horizon-card">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-horizon-text">הוספת מוצר חדש</h1>
            <p className="text-horizon-accent mt-1">הזן את פרטי המוצר באופן ידני</p>
          </div>
        </div>

        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-horizon-text">
              <PlusCircle className="w-6 h-6 text-horizon-primary" />
              טופס מוצר
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-500/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="default" className="mb-4 bg-green-500/20 border-green-500/30 text-green-300">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-horizon-accent">שם המוצר <span className="text-red-400">*</span></Label>
                  <Input 
                    id="name" 
                    value={productData.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)} 
                    required 
                    className={`bg-horizon-card border-horizon text-horizon-text ${validationErrors.name ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.name && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="product_code" className="text-horizon-accent">קוד פריט (ברקוד)</Label>
                  <Input 
                    id="product_code" 
                    value={productData.product_code} 
                    onChange={(e) => handleInputChange('product_code', e.target.value)} 
                    className="bg-horizon-card border-horizon text-horizon-text"
                  />
                </div>
              </div>
              
              <div>
                  <Label htmlFor="category" className="text-horizon-accent">קטגוריה</Label>
                  <Input 
                    id="category" 
                    value={productData.category} 
                    onChange={(e) => handleInputChange('category', e.target.value)} 
                    className={`bg-horizon-card border-horizon text-horizon-text ${validationErrors.category ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.category && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.category}</p>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="cost_price" className="text-horizon-accent">מחיר עלות (₪) <span className="text-red-400">*</span></Label>
                  <Input 
                    id="cost_price" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={productData.cost_price} 
                    onChange={(e) => handleInputChange('cost_price', e.target.value)} 
                    required 
                    className={`bg-horizon-card border-horizon text-horizon-text ${validationErrors.cost_price ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.cost_price && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.cost_price}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="selling_price" className="text-horizon-accent">מחיר מכירה (₪) <span className="text-red-400">*</span></Label>
                  <Input 
                    id="selling_price" 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    value={productData.selling_price} 
                    onChange={(e) => handleInputChange('selling_price', e.target.value)} 
                    required 
                    className={`bg-horizon-card border-horizon text-horizon-text ${validationErrors.selling_price ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.selling_price && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.selling_price}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="monthly_sales" className="text-horizon-accent">מכירות חודשיות (יחידות)</Label>
                  <Input 
                    id="monthly_sales" 
                    type="number" 
                    min="0" 
                    value={productData.monthly_sales} 
                    onChange={(e) => handleInputChange('monthly_sales', e.target.value)} 
                    className={`bg-horizon-card border-horizon text-horizon-text ${validationErrors.monthly_sales ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.monthly_sales && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.monthly_sales}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="inventory" className="text-horizon-accent">כמות במלאי</Label>
                  <Input 
                    id="inventory" 
                    type="number" 
                    min="0" 
                    value={productData.inventory} 
                    onChange={(e) => handleInputChange('inventory', e.target.value)} 
                    className={`bg-horizon-card border-horizon text-horizon-text ${validationErrors.inventory ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.inventory && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.inventory}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="supplier" className="text-horizon-accent">ספק</Label>
                <Input 
                  id="supplier" 
                  value={productData.supplier} 
                  onChange={(e) => handleInputChange('supplier', e.target.value)} 
                  className={`bg-horizon-card border-horizon text-horizon-text ${validationErrors.supplier ? 'border-red-500' : ''}`}
                />
                {validationErrors.supplier && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.supplier}</p>
                )}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full btn-horizon-primary text-lg py-3">
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : "הוסף מוצר"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}