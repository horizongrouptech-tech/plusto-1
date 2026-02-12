import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building, User, Phone, Mail, Star, Tag, 
  Truck, Clock, CreditCard, UserPlus 
} from 'lucide-react';

// מודל פשוט להצגת פרטי ספק מוצע (לא ספק של הלקוח)
export default function SupplierPreviewModal({ 
  supplier, 
  isOpen, 
  onClose, 
  onAssign,
  canAssign = true 
}) {
  if (!supplier) return null;

  const renderStarRating = (rating) => {
    if (!rating) return <span className="text-horizon-accent text-sm">לא דורג</span>;
    return (
      <div className="flex items-center gap-1">
        <span className="font-semibold text-horizon-text">{rating}/5</span>
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
          />
        ))}
      </div>
    );
  };

  const getCategoryBadgeStyle = (category) => {
    const styles = {
      'מזון': 'bg-green-100 text-green-800 border-green-200',
      'טכנולוגיה': 'bg-blue-100 text-blue-800 border-blue-200',
      'אופנה': 'bg-purple-100 text-purple-800 border-purple-200',
      'ניקיון': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'שירותים': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'שירותים פיננסיים': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'חומרי גלם': 'bg-amber-100 text-amber-800 border-amber-200',
      'כללי': 'bg-gray-100 text-gray-800 border-gray-200',
      'default': 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return styles[category] || styles.default;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-horizon-dark border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-horizon-text flex items-center gap-2">
            <Building className="w-5 h-5 text-horizon-primary" />
            {supplier.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* קטגוריה וסטטוס */}
          <div className="flex items-center gap-2 flex-wrap">
            {supplier.category && (
              <Badge className={getCategoryBadgeStyle(supplier.category)}>
                <Tag className="w-3 h-3 ml-1" />
                {supplier.category}
              </Badge>
            )}
            {/* commented out - partner supplier feature disabled for now
            {supplier.is_partner_supplier && (
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                ספק שותף
              </Badge>
            )}
            */}
          </div>

          {/* דירוג */}
          <Card className="bg-horizon-card/50 border-horizon">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-horizon-accent">דירוג:</span>
                {renderStarRating(supplier.rating)}
              </div>
            </CardContent>
          </Card>

          {/* פרטי קשר */}
          <Card className="bg-horizon-card/50 border-horizon">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-horizon-text flex items-center gap-2">
                <User className="w-4 h-4 text-horizon-primary" />
                פרטי קשר
              </h3>
              
              {supplier.contact_person && (
                <div className="flex items-center gap-2 text-horizon-text">
                  <User className="w-4 h-4 text-horizon-accent" />
                  <span>{supplier.contact_person}</span>
                </div>
              )}

              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-horizon-accent" />
                  <a href={`tel:${supplier.phone}`} className="text-horizon-primary hover:underline">
                    {supplier.phone}
                  </a>
                </div>
              )}

              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-horizon-accent" />
                  <a href={`mailto:${supplier.email}`} className="text-horizon-primary hover:underline">
                    {supplier.email}
                  </a>
                </div>
              )}

              {!supplier.contact_person && !supplier.phone && !supplier.email && (
                <p className="text-horizon-accent text-sm">אין פרטי קשר זמינים</p>
              )}
            </CardContent>
          </Card>

          {/* מידע נוסף */}
          {(supplier.delivery_time || supplier.payment_terms) && (
            <Card className="bg-horizon-card/50 border-horizon">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-horizon-text flex items-center gap-2">
                  <Truck className="w-4 h-4 text-horizon-primary" />
                  תנאים
                </h3>
                
                {supplier.delivery_time && (
                  <div className="flex items-center gap-2 text-horizon-text">
                    <Clock className="w-4 h-4 text-horizon-accent" />
                    <span>זמן אספקה: {supplier.delivery_time}</span>
                  </div>
                )}

                {supplier.payment_terms && (
                  <div className="flex items-center gap-2 text-horizon-text">
                    <CreditCard className="w-4 h-4 text-horizon-accent" />
                    <span>תנאי תשלום: {supplier.payment_terms}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* הודעת מידע */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              💡 זהו ספק מוצע שיכול להתאים לעסק. לחץ "שייך ללקוח" כדי להוסיף אותו לרשימת הספקים.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4 flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-horizon text-horizon-text"
          >
            סגור
          </Button>
          {canAssign && (
            <Button 
              onClick={() => {
                onAssign(supplier);
                onClose();
              }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <UserPlus className="w-4 h-4 ml-2" />
              שייך ללקוח
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
