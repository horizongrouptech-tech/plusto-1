import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  FileText,
  Lightbulb,
  DollarSign,
  TrendingUp,
  Upload,
  Package,
  Target,
  Truck,
  Edit,
  Loader2,
  Globe,
  Building2,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { formatCurrency } from '@/components/forecast/manual/utils/numberFormatter';
import CreateRecommendationButtons from '@/components/admin/CreateRecommendationButtons';

export default function CustomerOverviewModal({ 
  customer, 
  isOpen, 
  onClose,
  onOpenSettings,
  onNavigateToTab,
  onCreateSystemRec,
  onCreateTargeted,
  onCreateGoalOriented,
  onCreateManual,
  isGenerating
}) {
  // טעינת המלצות
  const { data: recommendations = [] } = useQuery({
    queryKey: ['customerRecommendations', customer?.email],
    queryFn: () => base44.entities.Recommendation.filter({
      customer_email: customer.email,
      status: { $ne: 'archived' }
    }),
    enabled: !!customer?.email && isOpen,
  });

  // טעינת קבצים
  const { data: files = [] } = useQuery({
    queryKey: ['customerFiles', customer?.email],
    queryFn: () => base44.entities.FileUpload.filter({
      customer_email: customer.email
    }),
    enabled: !!customer?.email && isOpen,
  });

  // חישוב סטטיסטיקות
  const stats = useMemo(() => {
    const activeRecs = recommendations.filter(r => 
      r.status === 'pending' || r.status === 'saved' || r.status === 'published_by_admin'
    );
    
    const totalPotentialProfit = recommendations.reduce((sum, r) => 
      sum + (r.expected_profit || 0), 0
    );

    return {
      totalRecommendations: recommendations.length,
      activeRecommendations: activeRecs.length,
      totalFiles: files.length,
      potentialProfit: totalPotentialProfit
    };
  }, [recommendations, files]);

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2">
            <Building2 className="w-6 h-6 text-horizon-primary" />
            סקירה כללית - {customer.business_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* סטטיסטיקות מפתח */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="card-horizon">
              <CardContent className="p-4 text-center">
                <Lightbulb className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm text-horizon-accent mb-1">המלצות פעילות</p>
                <p className="text-2xl font-bold text-horizon-text">
                  {stats.activeRecommendations}/{stats.totalRecommendations}
                </p>
              </CardContent>
            </Card>

            <Card className="card-horizon">
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-horizon-accent mb-1">קבצים</p>
                <p className="text-2xl font-bold text-horizon-text">{stats.totalFiles}</p>
              </CardContent>
            </Card>

            <Card className="card-horizon">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-horizon-accent mb-1">רווח פוטנציאלי</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(stats.potentialProfit, 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="card-horizon">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-horizon-primary mx-auto mb-2" />
                <p className="text-sm text-horizon-accent mb-1">סטטוס</p>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  פעיל
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* פרטי לקוח */}
          <Card className="card-horizon">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-horizon-text">פרטי לקוח</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך פרטים
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-horizon-accent">שם העסק</p>
                  <p className="font-medium text-horizon-text">{customer.business_name || 'לא צוין'}</p>
                </div>
                <div>
                  <p className="text-sm text-horizon-accent">שם המנהל</p>
                  <p className="font-medium text-horizon-text">{customer.full_name || customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-horizon-accent">אימייל</p>
                  <p className="font-medium text-horizon-text" dir="ltr">{customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-horizon-accent">טלפון</p>
                  <p className="font-medium text-horizon-text" dir="ltr">{customer.phone || 'לא צוין'}</p>
                </div>
                <div>
                  <p className="text-sm text-horizon-accent">סוג עסק</p>
                  <p className="font-medium text-horizon-text">{customer.business_type || 'לא צוין'}</p>
                </div>
                <div>
                  <p className="text-sm text-horizon-accent">קבוצה</p>
                  <Badge className={`text-xs ${
                    customer.customer_group === 'A' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    customer.customer_group === 'B' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    'bg-orange-500/20 text-orange-400 border-orange-500/30'
                  }`}>
                    קבוצה {customer.customer_group || '-'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* כפתורי פעולה מהירה */}
          <div className="space-y-3">
            <h3 className="font-semibold text-horizon-text">פעולות מהירות</h3>
            
            <CreateRecommendationButtons
              onCreateSystemRecommendations={onCreateSystemRec}
              onCreateTargeted={onCreateTargeted}
              onCreateGoalOriented={onCreateGoalOriented}
              onCreateManual={onCreateManual}
              isGenerating={isGenerating}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToTab('files');
                }}
                className="border-horizon text-horizon-text hover:bg-horizon-card h-12"
              >
                <Upload className="w-5 h-5 ml-2" />
                העלה קובץ
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToTab('catalog');
                }}
                className="border-horizon text-horizon-text hover:bg-horizon-card h-12"
              >
                <Package className="w-5 h-5 ml-2" />
                קטלוג מוצרים
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToTab('forecast');
                }}
                className="border-horizon text-horizon-text hover:bg-horizon-card h-12"
              >
                <FileText className="w-5 h-5 ml-2" />
                תוכנית עסקית
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToTab('goals');
                }}
                className="border-horizon text-horizon-text hover:bg-horizon-card h-12"
              >
                <Target className="w-5 h-5 ml-2" />
                יעדים
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToTab('suppliers');
                }}
                className="border-horizon text-horizon-text hover:bg-horizon-card h-12"
              >
                <Truck className="w-5 h-5 ml-2" />
                ספקים
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToTab('website');
                }}
                className="border-horizon text-horizon-text hover:bg-horizon-card h-12"
              >
                <Globe className="w-5 h-5 ml-2" />
                סריקת אתר
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}