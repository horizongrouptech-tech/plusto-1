import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FolderOpen,
  Lightbulb,
  Package,
  FileText,
  Target,
  Truck,
  DollarSign,
  Building2,
  Globe
} from 'lucide-react';

// ייבוא קומפוננטות קיימות
import CustomerFileUploadManager from '@/components/admin/CustomerFileUploadManager';
import StrategicRecommendations from '@/components/admin/StrategicRecommendations';
import AdvancedCatalogManager from '@/components/admin/AdvancedCatalogManager';
import UnifiedForecastManager from '@/components/forecast/UnifiedForecastManager';
import CustomerGoalsGantt from '@/components/admin/CustomerGoalsGantt';
import CustomerSuppliersTab from '@/components/admin/CustomerSuppliersTab';
import WebsiteScanner from '@/components/admin/WebsiteScanner';

const tabs = [
  { id: 'files', label: 'קבצים', icon: FolderOpen },
  { id: 'recommendations', label: 'המלצות', icon: Lightbulb },
  { id: 'catalog', label: 'קטלוג', icon: Package },
  { id: 'forecast', label: 'תוכנית עסקית', icon: FileText },
  { id: 'goals', label: 'יעדים', icon: Target },
  { id: 'suppliers', label: 'ספקים', icon: Truck },
  { id: 'website', label: 'סריקת אתר', icon: Globe },
];

export default function WorkboardPanel({ customer, activeTab, onTabChange }) {
  if (!customer) {
    return (
      <div className="flex-1 flex items-center justify-center bg-horizon-dark">
        <div className="text-center text-horizon-accent">
          <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">בחר לקוח מהרשימה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-horizon-dark">
      {/* Customer Header */}
      <div className="bg-horizon-card border-b border-horizon px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-horizon-text">
              {customer.business_name || 'ללא שם עסק'}
            </h2>
            <p className="text-sm text-horizon-accent">
              {customer.full_name} • {customer.email}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-horizon-card border-b border-horizon px-4 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-horizon-primary text-white' 
                    : 'text-horizon-accent hover:text-horizon-text hover:bg-horizon-dark'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'files' && (
          <CustomerFileUploadManager customer={customer} />
        )}
        
        {activeTab === 'recommendations' && (
          <StrategicRecommendations customer={customer} />
        )}
        
        {activeTab === 'catalog' && (
          <AdvancedCatalogManager customer={customer} />
        )}
        
        {activeTab === 'forecast' && (
          <UnifiedForecastManager customer={customer} />
        )}
        
        {activeTab === 'goals' && (
          <CustomerGoalsGantt customer={customer} />
        )}
        
        {activeTab === 'suppliers' && (
          <CustomerSuppliersTab customer={customer} />
        )}
        
        {activeTab === 'website' && (
          <WebsiteScanner customer={customer} />
        )}
      </div>
    </div>
  );
}