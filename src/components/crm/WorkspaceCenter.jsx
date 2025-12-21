import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Lightbulb, Package, TrendingUp, Target, Users, DollarSign } from "lucide-react";
import CustomerFileUploadManager from '../admin/CustomerFileUploadManager';
import CatalogProgressTracker from '../catalog/CatalogProgressTracker';
import UnifiedForecastManager from '../forecast/UnifiedForecastManager';
import CustomerGoalsGantt from '../admin/CustomerGoalsGantt';
import CustomerSuppliersTab from '../admin/CustomerSuppliersTab';

export default function WorkspaceCenter({ selectedClient, currentUser, isAdmin }) {
  if (!selectedClient) {
    return (
      <div className="flex-1 flex items-center justify-center bg-horizon-dark">
        <div className="text-center">
          <Users className="w-16 h-16 text-horizon-accent mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-horizon-text mb-2">
            בחר לקוח להתחלת עבודה
          </h3>
          <p className="text-horizon-accent">
            בחר לקוח מהרשימה מימין כדי לצפות ולנהל את הנתונים שלו
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-horizon-dark overflow-hidden flex flex-col">
      <div className="p-4 border-b border-horizon bg-horizon-card">
        <h2 className="text-xl font-bold text-horizon-text">
          {selectedClient.business_name || selectedClient.full_name}
        </h2>
        <p className="text-sm text-horizon-accent">{selectedClient.email}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="files" dir="rtl" className="w-full">
          <TabsList className="bg-horizon-card border border-horizon mb-4">
            <TabsTrigger value="files" className="gap-2">
              <FileUp className="w-4 h-4" />
              קבצים
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              המלצות
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2">
              <Package className="w-4 h-4" />
              קטלוג
            </TabsTrigger>
            <TabsTrigger value="forecast" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              תוכנית עסקית
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Target className="w-4 h-4" />
              יעדים
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Users className="w-4 h-4" />
              ספקים
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="gap-2">
              <DollarSign className="w-4 h-4" />
              תזרים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-0">
            <CustomerFileUploadManager
              customerEmail={selectedClient.email}
              customerName={selectedClient.business_name || selectedClient.full_name}
            />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-0">
            <div className="bg-horizon-card rounded-lg border border-horizon p-6 text-center">
              <Lightbulb className="w-12 h-12 text-horizon-primary mx-auto mb-3" />
              <h3 className="font-semibold text-horizon-text mb-2">המלצות</h3>
              <p className="text-horizon-accent text-sm">
                טאב המלצות יחובר בהמשך
              </p>
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="mt-0">
            <CatalogProgressTracker
              customerEmail={selectedClient.email}
              customerName={selectedClient.business_name || selectedClient.full_name}
            />
          </TabsContent>

          <TabsContent value="forecast" className="mt-0">
            <UnifiedForecastManager
              customerEmail={selectedClient.email}
              customerData={selectedClient}
            />
          </TabsContent>

          <TabsContent value="goals" className="mt-0">
            <CustomerGoalsGantt
              customerEmail={selectedClient.email}
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-0">
            <CustomerSuppliersTab
              customerEmail={selectedClient.email}
              currentUser={currentUser}
            />
          </TabsContent>

          <TabsContent value="cashflow" className="mt-0">
            <div className="bg-horizon-card rounded-lg border border-horizon p-8 text-center">
              <DollarSign className="w-16 h-16 text-horizon-primary mx-auto mb-4 opacity-70" />
              <h3 className="text-xl font-semibold text-horizon-text mb-2">תזרים מזומנים</h3>
              <p className="text-horizon-accent mb-4">
                הפונקציונליות של תזרים תפותח לאחר קבלת קבצי דוגמה מ-BusyBox
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-right">
                <p className="text-sm text-horizon-text font-medium mb-2">
                  📋 מה נדרש לפיתוח:
                </p>
                <ul className="text-sm text-horizon-accent space-y-1 list-disc list-inside">
                  <li>קובץ Excel של תזרים מזומנים</li>
                  <li>קובץ חשבונות בנק (תנועות)</li>
                  <li>הגדרת מבנה הנתונים והעמודות</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}