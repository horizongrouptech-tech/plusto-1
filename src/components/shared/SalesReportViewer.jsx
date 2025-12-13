import React, { useState } from 'react';
import { TrendingUp, DollarSign, Package, Sparkles } from "lucide-react";
import DeeperInsightsModal from "./DeeperInsightsModal";
import { Button } from "@/components/ui/button";

export default function SalesReportViewer({ fileData }) {
    const [showDeeperInsightsModal, setShowDeeperInsightsModal] = useState(false);
    const [localFileData, setLocalFileData] = useState(fileData);

    const handleInsightsUpdated = (updatedFile) => {
        setLocalFileData(updatedFile);
    };

    const summary = localFileData?.parsed_data?.summary || {};
    const topProducts = summary.top_selling_products || [];

    return (
        <div className="p-6 bg-horizon-card rounded-lg" dir="rtl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-horizon-text">סיכום דוח מכירות</h3>
                </div>
                {localFileData?.status === 'analyzed' && localFileData?.ai_insights && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeeperInsightsModal(true)}
                        className="text-horizon-accent border-horizon-primary/50 hover:text-horizon-primary hover:bg-horizon-primary/10"
                    >
                        <Sparkles className="w-4 h-4 ml-2" /> תובנות נוספות
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-horizon-card/30 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-horizon-accent">סה"כ הכנסות</p>
                        <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-horizon-text">₪{summary.total_revenue?.toLocaleString() || 'N/A'}</p>
                </div>
                <div className="bg-horizon-card/30 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-horizon-accent">סה"כ מכירות</p>
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-horizon-text">{summary.total_sales_count?.toLocaleString() || 'N/A'}</p>
                </div>
                <div className="bg-horizon-card/30 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-horizon-accent">מוצרים נמכרים ייחודיים</p>
                        <Package className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-horizon-text">{summary.unique_products_sold?.toLocaleString() || 'N/A'}</p>
                </div>
            </div>

            {topProducts.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold text-horizon-text mb-3">מוצרים מובילים</h4>
                    <div className="space-y-2">
                        {topProducts.map((product, index) => (
                            <div key={index} className="flex justify-between p-3 bg-horizon-card/30 rounded-md">
                                <span className="font-medium text-horizon-text">{product.name}</span>
                                <span className="text-green-400">₪{product.revenue?.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {showDeeperInsightsModal && localFileData && (
                <DeeperInsightsModal
                    isOpen={showDeeperInsightsModal}
                    onClose={() => setShowDeeperInsightsModal(false)}
                    fileData={localFileData}
                    onInsightsUpdated={handleInsightsUpdated}
                />
            )}
        </div>
    );
}