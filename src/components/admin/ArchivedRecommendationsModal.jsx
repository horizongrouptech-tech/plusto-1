import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Search, User, Calendar, Layers } from 'lucide-react';
import _ from 'lodash';

export default function ArchivedRecommendationsModal({ isOpen, onClose, archivedRecommendations }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');

  // Get unique customers for filter
  const customers = useMemo(() => {
    if (!archivedRecommendations) return [];
    return [...new Set(archivedRecommendations.map(rec => rec.customer_email))].sort();
  }, [archivedRecommendations]);

  // Filter and group recommendations
  const filteredAndGroupedRecommendations = useMemo(() => {
    if (!archivedRecommendations) return {};

    let filtered = archivedRecommendations;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(rec => 
        rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by customer
    if (selectedCustomer !== 'all') {
      filtered = filtered.filter(rec => rec.customer_email === selectedCustomer);
    }

    // Group by customer
    return _.groupBy(filtered, 'customer_email');
  }, [archivedRecommendations, searchTerm, selectedCustomer]);

  const getCategoryLabel = (category) => {
    const labels = {
      'pricing': 'תמחור',
      'bundles': 'חבילות',
      'promotions': 'מבצעים',
      'suppliers': 'ספקים',
      'strategic_moves': 'מהלכים אסטרטגיים'
    };
    return labels[category] || category;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col bg-horizon-dark border-horizon text-horizon-text" dir="rtl">
        <DialogHeader className="pr-6 pt-6">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <Archive className="w-7 h-7 text-orange-500" />
            ארכיון המלצות
          </DialogTitle>
          <p className="text-horizon-accent text-right">
            סך הכל: {archivedRecommendations?.length || 0} המלצות בארכיון
          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="px-6 pb-4 border-b border-horizon">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
              <Input
                placeholder="חיפוש במלצות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-horizon-card border-horizon text-horizon-text"
              />
            </div>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-64 bg-horizon-card border-horizon text-horizon-text">
                <SelectValue placeholder="בחר לקוח" />
              </SelectTrigger>
              <SelectContent className="bg-horizon-card border-horizon">
                <SelectItem value="all" className="text-horizon-text">כל הלקוחות</SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer} value={customer} className="text-horizon-text">
                    {customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {Object.keys(filteredAndGroupedRecommendations).length > 0 ? (
            Object.entries(filteredAndGroupedRecommendations).map(([customerEmail, recommendations]) => (
              <Card key={customerEmail} className="card-horizon">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-horizon-primary">
                    <User className="w-5 h-5" />
                    {customerEmail}
                    <Badge variant="outline" className="mr-2 border-horizon-accent text-horizon-accent">
                      {recommendations.length} המלצות
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="p-4 bg-horizon-card/20 rounded-lg border border-horizon">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-horizon-text text-right">{rec.title}</h4>
                            <p className="text-sm text-horizon-accent text-right mt-1 line-clamp-2">
                              {rec.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 justify-end mt-3">
                          <Badge className={getPriorityColor(rec.priority)}>
                            עדיפות {rec.priority === 'high' ? 'גבוהה' : rec.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                          </Badge>
                          <Badge variant="outline" className="border-horizon-secondary text-horizon-accent">
                            <Layers className="w-3 h-3 ml-1" />
                            {getCategoryLabel(rec.category)}
                          </Badge>
                          {rec.expected_profit && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              ₪{rec.expected_profit.toLocaleString()}
                            </Badge>
                          )}
                          <Badge variant="outline" className="border-horizon-accent text-horizon-accent">
                            <Calendar className="w-3 h-3 ml-1" />
                            {new Date(rec.created_date).toLocaleDateString('he-IL')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10">
              <Archive className="w-16 h-16 mx-auto mb-4 text-horizon-accent" />
              <p className="text-horizon-accent">לא נמצאו המלצות בארכיון התואמות לסינון.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}