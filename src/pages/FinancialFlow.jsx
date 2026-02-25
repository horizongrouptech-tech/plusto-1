import React, { useState, useEffect } from "react";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Edit3, Save, X, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Product, User } from '@/api/entities';

export default function FinancialFlowPage() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingExpenses, setIsEditingExpenses] = useState(false);
  const [editedExpenses, setEditedExpenses] = useState({});

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      if (userData) {
        const userProducts = await Product.filter({ created_by: userData.email });
        setProducts(userProducts);
        
        // Initialize edited expenses with current values
        setEditedExpenses({
          monthly_revenue: userData.monthly_revenue || 0,
          employee_salaries: userData.employee_salaries || 0,
          service_providers: userData.service_providers || []
        });
      }
    } catch (error) {
      console.error("Error loading financial data:", error);
    }
    setIsLoading(false);
  };

  const handleSaveExpenses = async () => {
    try {
      await User.updateMyUserData({
        monthly_revenue: editedExpenses.monthly_revenue,
        employee_salaries: editedExpenses.employee_salaries,
        service_providers: editedExpenses.service_providers
      });
      
      setUser(prev => ({
        ...prev,
        monthly_revenue: editedExpenses.monthly_revenue,
        employee_salaries: editedExpenses.employee_salaries,
        service_providers: editedExpenses.service_providers
      }));
      
      setIsEditingExpenses(false);
      toast.success("הנתונים נשמרו בהצלחה!");
    } catch (error) {
      console.error("Error saving expenses:", error);
      toast.error("שגיאה בשמירת הנתונים");
    }
  };

  const formatCurrency = (amount, isNegative = false) => {
    const absAmount = Math.abs(amount || 0);
    const formattedAmount = absAmount.toLocaleString();
    
    if (isNegative || amount < 0) {
      return `-₪${formattedAmount}`;
    }
    return `₪${formattedAmount}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-horizon-dark p-6 flex items-center justify-center">
        <div className="text-horizon-text">טוען נתונים כספיים...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-horizon-dark p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-horizon-text mb-4">לא ניתן לטעון נתונים</h1>
          <Button asChild className="btn-horizon-primary">
            <Link to={createPageUrl("Dashboard")}>חזור לדשבורד</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate totals with accurate tax calculation
  const totalRevenue = user.monthly_revenue || 0;
  const productRevenue = products.reduce((sum, product) => sum + (product.monthly_revenue || 0), 0);
  const actualRevenue = Math.max(totalRevenue, productRevenue);
  
  const salaryExpenses = user.employee_salaries || 0;
  const serviceExpenses = (user.service_providers || []).reduce((sum, service) => sum + (service.monthly_cost || 0), 0);
  const totalExpenses = salaryExpenses + serviceExpenses;
  
  // Calculate gross profit (before tax)
  const grossProfit = actualRevenue - totalExpenses;
  
  // Calculate tax (23% on gross profit, only if profit is positive)
  const taxAmount = grossProfit > 0 ? grossProfit * 0.23 : 0;
  
  // Calculate net profit (after tax)
  const netProfit = grossProfit - taxAmount;
  
  // Calculate profit margins
  const grossProfitMargin = actualRevenue > 0 ? ((grossProfit / actualRevenue) * 100) : 0;
  const netProfitMargin = actualRevenue > 0 ? ((netProfit / actualRevenue) * 100) : 0;

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="rounded-xl border-horizon text-horizon-text hover:bg-horizon-card">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-horizon-text">מסע הכסף</h1>
            <p className="text-horizon-accent mt-1">תמונת מצב כספית מלאה של העסק (כולל מס 23%)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Card */}
          <Card className="card-horizon">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-horizon-text">
                <TrendingUp className="w-5 h-5 text-green-400" />
                הכנסות חודשיות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400 mb-2">
                {formatCurrency(actualRevenue)}
              </div>
              <p className="text-sm text-horizon-accent">
                מחזור עסקי חודשי
              </p>
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card className="card-horizon">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-horizon-text">
                <TrendingDown className="w-5 h-5 text-red-400" />
                הוצאות חודשיות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400 mb-2">
                {formatCurrency(totalExpenses, true)}
              </div>
              <p className="text-sm text-horizon-accent">
                סך הוצאות תפעוליות
              </p>
            </CardContent>
          </Card>

          {/* Net Profit Card */}
          <Card className="card-horizon">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-horizon-text">
                <DollarSign className="w-5 h-5 text-horizon-primary" />
                רווח נקי (אחרי מס)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold mb-2 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(netProfit, netProfit < 0)}
              </div>
              <p className="text-sm text-horizon-accent">
                {netProfitMargin >= 0 ? `${netProfitMargin.toFixed(1)}%` : `${Math.abs(netProfitMargin).toFixed(1)}%-`} מהמחזור
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Financial Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <Card className="card-horizon">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-horizon-text">פירוט הכנסות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-horizon-card rounded-lg">
                <span className="text-horizon-accent">מחזור חודשי מדווח</span>
                <span className="font-semibold text-horizon-text">{formatCurrency(totalRevenue)}</span>
              </div>
              {products.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-horizon-card rounded-lg">
                  <span className="text-horizon-accent">הכנסה ממוצרים ({products.length} מוצרים)</span>
                  <span className="font-semibold text-horizon-text">{formatCurrency(productRevenue)}</span>
                </div>
              )}
              <Separator className="bg-horizon" />
              <div className="flex justify-between items-center p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                <span className="font-semibold text-green-400">סך הכנסות חודשיות</span>
                <span className="font-bold text-green-400 text-lg">{formatCurrency(actualRevenue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Breakdown */}
          <Card className="card-horizon">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-horizon-text">פירוט הוצאות</CardTitle>
              <Button 
                onClick={() => setIsEditingExpenses(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all duration-200"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                עריכת הוצאות תפעול
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditingExpenses ? (
                <>
                  <div className="flex justify-between items-center p-3 bg-horizon-card rounded-lg">
                    <span className="text-horizon-accent">שכר עובדים</span>
                    <span className="font-semibold text-horizon-text">{formatCurrency(salaryExpenses, true)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-horizon-card rounded-lg">
                    <span className="text-horizon-accent">ספקי שירות</span>
                    <span className="font-semibold text-horizon-text">{formatCurrency(serviceExpenses, true)}</span>
                  </div>
                  <Separator className="bg-horizon" />
                  <div className="flex justify-between items-center p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                    <span className="font-semibold text-red-400">סך הוצאות חודשיות</span>
                    <span className="font-bold text-red-400 text-lg">{formatCurrency(totalExpenses, true)}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-horizon-text">שכר עובדים (חודשי)</Label>
                    <Input
                      type="number"
                      value={editedExpenses.employee_salaries}
                      onChange={(e) => setEditedExpenses({...editedExpenses, employee_salaries: parseFloat(e.target.value) || 0})}
                      className="bg-horizon-card border-horizon text-horizon-text"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveExpenses} className="btn-horizon-primary">
                      <Save className="w-4 h-4 mr-2" />
                      שמור
                    </Button>
                    <Button onClick={() => setIsEditingExpenses(false)} variant="outline" className="border-horizon text-horizon-text">
                      <X className="w-4 h-4 mr-2" />
                      ביטול
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tax and Profit Calculation */}
        <Card className="card-horizon mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-horizon-text">
              <Calculator className="w-5 h-5 text-horizon-primary" />
              חישוב רווח ומס
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-horizon-primary border-b border-horizon pb-2">שלבי החישוב</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-horizon-accent">הכנסות חודשיות:</span>
                    <span className="text-green-400 font-medium">{formatCurrency(actualRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-horizon-accent">הוצאות תפעוליות:</span>
                    <span className="text-red-400 font-medium">{formatCurrency(totalExpenses, true)}</span>
                  </div>
                  <Separator className="bg-horizon" />
                  <div className="flex justify-between">
                    <span className="font-medium text-horizon-text">רווח גולמי (לפני מס):</span>
                    <span className={`font-bold ${grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(grossProfit, grossProfit < 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-horizon-accent">מס (23%):</span>
                    <span className="text-orange-400 font-medium">{formatCurrency(taxAmount, true)}</span>
                  </div>
                  <Separator className="bg-horizon" />
                  <div className="flex justify-between p-3 bg-horizon-primary/10 rounded-lg border border-horizon-primary/30">
                    <span className="font-bold text-horizon-primary">רווח נקי (אחרי מס):</span>
                    <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(netProfit, netProfit < 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-horizon-primary border-b border-horizon pb-2">מדדי רווחיות</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-horizon-card rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-horizon-accent">שולי רווח גולמי:</span>
                      <span className={`font-bold ${grossProfitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {grossProfitMargin >= 0 ? `${grossProfitMargin.toFixed(1)}%` : `${Math.abs(grossProfitMargin).toFixed(1)}%-`}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-horizon-card rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-horizon-accent">שולי רווח נקי:</span>
                      <span className={`font-bold ${netProfitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {netProfitMargin >= 0 ? `${netProfitMargin.toFixed(1)}%` : `${Math.abs(netProfitMargin).toFixed(1)}%-`}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-horizon-card rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-horizon-accent">עומס המס:</span>
                      <span className="text-orange-400 font-bold">
                        {grossProfit > 0 ? `${((taxAmount / grossProfit) * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                  {netProfit > 0 && (
                    <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                      <div className="text-center">
                        <div className="text-sm text-green-400 mb-1">רווח נקי שנתי צפוי</div>
                        <div className="text-xl font-bold text-green-400">{formatCurrency(netProfit * 12)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}