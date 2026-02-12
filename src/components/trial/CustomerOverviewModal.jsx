import React, { useMemo, useState } from 'react';
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
  Mail,
  MessageSquare,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { formatCurrency } from '@/components/forecast/manual/utils/numberFormatter';
import Ofek360Modal from '@/components/admin/Ofek360Modal';
import GoalBankManager from '@/components/admin/GoalBankManager';
import InlineEditableCustomerDetails from '@/components/admin/InlineEditableCustomerDetails';
import InlineEditableField from '@/components/admin/goals/InlineEditableField';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";

export default function CustomerOverviewModal({ 
  customer, 
  isOpen, 
  onClose,
  onOpenSettings,
  onNavigateToTab,
  onArchive
}) {
  const [ofek360Open, setOfek360Open] = useState(false);
  const [goalBankOpen, setGoalBankOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  // טעינת המשתמש הנוכחי
  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      return user;
    },
    enabled: isOpen,
  });
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

  const whatsappUrl = customer.phone 
    ? `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`
    : null;

  const handleFieldUpdate = async (field, value) => {
    try {
      await base44.entities.OnboardingRequest.update(customer.id, {
        [field]: value
      });
      queryClient.invalidateQueries(['activeCustomers']);
    } catch (error) {
      toast.error('שגיאה בעדכון: ' + error.message);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-horizon-text flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-horizon-primary" />
                סקירה כללית - {customer.business_name}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenSettings) {
                      onOpenSettings();
                    }
                  }}
                  className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך פרטים
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm('האם להעביר את הלקוח לארכיון?')) return;
                    if (onArchive) {
                      await onArchive(customer);
                    }
                  }}
                  className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                >
                  <AlertCircle className="w-4 h-4 ml-2" />
                  העבר לארכיון
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-6">
          {/* כפתורים עליונים */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              onClick={() => setOfek360Open(true)}
              className="bg-gradient-to-r from-horizon-primary to-horizon-secondary hover:from-horizon-primary/90 hover:to-horizon-secondary/90 text-white h-12 flex-1 min-w-[200px]"
            >
              <Target className="w-5 h-5 ml-2" />
              אופק 360 - צ'ק ליסט יומי
            </Button>
            <Button
              onClick={() => setGoalBankOpen(true)}
              variant="outline"
              className="border-horizon-primary text-horizon-primary hover:bg-horizon-primary/10 h-12 flex-1 min-w-[200px]"
            >
              <BookOpen className="w-5 h-5 ml-2" />
              בנק יעדים
            </Button>
          </div>

          {/* פרטי לקוח עם עריכה משולבת */}
          <InlineEditableCustomerDetails 
            customer={customer}
            onUpdate={(updated) => {
              // אופציונלי: רענון נתונים
            }}
          />

          <Card className="card-horizon mt-4">
            <CardHeader>
              <CardTitle className="text-sm text-horizon-text">מוצרים ושירותים עיקריים</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEditableField
                value={customer.main_products_services || ''}
                onSave={(newValue) => handleFieldUpdate('main_products_services', newValue)}
                placeholder="הזן מוצרים ושירותים עיקריים"
                multiline={true}
              />
            </CardContent>
          </Card>

          <Card className="card-horizon mt-4">
            <CardHeader>
              <CardTitle className="text-sm text-horizon-text">יעדים עסקיים</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEditableField
                value={customer.business_goals || ''}
                onSave={(newValue) => handleFieldUpdate('business_goals', newValue)}
                placeholder="הזן יעדים עסקיים"
                multiline={true}
              />
            </CardContent>
          </Card>

          <Card className="card-horizon mt-4">
            <CardHeader>
              <CardTitle className="text-sm text-horizon-text">קהל יעד</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEditableField
                value={customer.target_audience || ''}
                onSave={(newValue) => handleFieldUpdate('target_audience', newValue)}
                placeholder="הזן קהל יעד"
                multiline={true}
              />
            </CardContent>
          </Card>

          {/* כפתורי פעולה מהירה */}
          <div className="space-y-3" dir="rtl">
            <h3 className="font-semibold text-horizon-text text-right">פעולות מהירות</h3>
            
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
                יעדים ומשימות
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

      {/* מודל אופק 360 */}
      {ofek360Open && (
        <Ofek360Modal
          customer={customer}
          isOpen={ofek360Open}
          onClose={() => setOfek360Open(false)}
        />
      )}

      {/* מודל בנק יעדים */}
      <Dialog open={goalBankOpen} onOpenChange={setGoalBankOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-horizon-text flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-horizon-primary" />
              בנק יעדים
            </DialogTitle>
          </DialogHeader>
          <GoalBankManager currentUser={currentUser} />
        </DialogContent>
      </Dialog>
    </>
  );
}