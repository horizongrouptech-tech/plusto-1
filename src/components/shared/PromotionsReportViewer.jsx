import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gift, Calendar, Store, TrendingUp, Lightbulb, Target } from "lucide-react";
import Pagination from "./Pagination";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function PromotionsReportViewer({ reportData, isOpen, onClose }) {
  const [currentPage, setCurrentPage] = useState(1);
  const promotionsPerPage = 10;

  if (!reportData) return null;

  const {
    promotions = [],
    summary = {},
    key_insights = [],
    actionable_recommendations = [],
    promotion_types_breakdown = [],
    seasonal_analysis = {}
  } = reportData;

  const indexOfLastPromotion = currentPage * promotionsPerPage;
  const indexOfFirstPromotion = indexOfLastPromotion - promotionsPerPage;
  const currentPromotions = promotions.slice(indexOfFirstPromotion, indexOfLastPromotion);
  const totalPages = Math.ceil(promotions.length / promotionsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return 'לא צוין';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch {
      return dateString;
    }
  };

  const getPromotionTypeBadge = (type) => {
    const typeConfig = {
      quantity_deal: { text: 'מבצע כמות', color: 'bg-blue-100 text-blue-800' },
      discount: { text: 'הנחה', color: 'bg-green-100 text-green-800' },
      bundle: { text: 'חבילה', color: 'bg-purple-100 text-purple-800' },
      seasonal: { text: 'עונתי', color: 'bg-orange-100 text-orange-800' },
      clearance: { text: 'פינוי מלאי', color: 'bg-red-100 text-red-800' },
      other: { text: 'אחר', color: 'bg-gray-100 text-gray-800' }
    };
    
    const config = typeConfig[type] || typeConfig.other;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card className={`bg-${color}-500/10 border-${color}-500/20 border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-horizon-accent">{title}</p>
            <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
          </div>
          <Icon className={`w-8 h-8 text-${color}-400`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Gift className="text-horizon-primary" />
            ניתוח דוח מבצעים
          </DialogTitle>
          <DialogDescription className="text-horizon-accent">
            ניתוח מקיף של אסטרטגיית המבצעים, מגמות ותובנות לאופטימיזציה.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="סה״כ מבצעים" value={summary.total_promotions || 0} icon={Gift} color="blue" />
            <StatCard title="מבצעים פעילים" value={summary.active_promotions || 0} icon={TrendingUp} color="green" />
            <StatCard title="מבצעים לא פעילים" value={summary.inactive_promotions || 0} icon={Calendar} color="red" />
            <StatCard title="ממוצע חנויות למבצע" value={(summary.average_stores_per_promotion || 0).toFixed(1)} icon={Store} color="purple" />
          </div>

          {/* Insights & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-horizon-primary"><Lightbulb /> תובנות אסטרטגיות</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 list-disc list-inside text-horizon-accent">
                  {key_insights.map((insight, idx) => <li key={idx}>{insight}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card className="card-horizon">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-horizon-primary"><Target /> המלצות לשיפור</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 list-disc list-inside text-horizon-accent">
                  {actionable_recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
          
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-horizon">
                <CardHeader><CardTitle className="text-horizon-text text-base">פילוח לפי סוג מבצע</CardTitle></CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {promotion_types_breakdown.map((type, i) => (
                            <li key={i} className="flex justify-between items-center text-sm">
                                <span className="text-horizon-accent">{type.type}</span> 
                                <span className="font-semibold text-blue-400">{type.count} מבצעים</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            <Card className="card-horizon">
                <CardHeader><CardTitle className="text-horizon-text text-base">ניתוח עונתי ומשכי זמן</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {seasonal_analysis.summer_promotions && (
                            <div className="flex justify-between text-sm">
                                <span className="text-horizon-accent">מבצעי קיץ</span>
                                <span className="font-semibold text-orange-400">{seasonal_analysis.summer_promotions}</span>
                            </div>
                        )}
                        {seasonal_analysis.ongoing_promotions && (
                            <div className="flex justify-between text-sm">
                                <span className="text-horizon-accent">מבצעים שוטפים</span>
                                <span className="font-semibold text-green-400">{seasonal_analysis.ongoing_promotions}</span>
                            </div>
                        )}
                        {seasonal_analysis.short_term_promotions && (
                            <div className="flex justify-between text-sm">
                                <span className="text-horizon-accent">מבצעים קצרי טווח</span>
                                <span className="font-semibold text-blue-400">{seasonal_analysis.short_term_promotions}</span>
                            </div>
                        )}
                        {seasonal_analysis.long_term_promotions && (
                            <div className="flex justify-between text-sm">
                                <span className="text-horizon-accent">מבצעים ארוכי טווח</span>
                                <span className="font-semibold text-purple-400">{seasonal_analysis.long_term_promotions}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* Detailed Promotions Table */}
          <Card className="card-horizon">
            <CardHeader>
              <CardTitle>רשימה מפורטת של מבצעים</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם המבצע</TableHead>
                    <TableHead>סוג</TableHead>
                    <TableHead className="text-center">סטטוס</TableHead>
                    <TableHead className="text-center">חנויות</TableHead>
                    <TableHead className="text-center">תחילה</TableHead>
                    <TableHead className="text-center">סיום</TableHead>
                    <TableHead>תיאור</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPromotions.map((promo, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-horizon-text">{promo.name}</TableCell>
                      <TableCell>{getPromotionTypeBadge(promo.promotion_type)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={promo.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {promo.is_active ? 'פעיל' : 'לא פעיל'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{promo.participating_stores || 0}</TableCell>
                      <TableCell className="text-center text-sm">{formatDate(promo.start_date)}</TableCell>
                      <TableCell className="text-center text-sm">{formatDate(promo.end_date)}</TableCell>
                      <TableCell className="text-sm text-horizon-accent max-w-xs truncate" title={promo.description}>
                        {promo.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </CardContent>
          </Card>
        </div>
        <DialogFooter className="pt-4 border-t border-horizon">
            <Button onClick={onClose} variant="outline">סגור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}