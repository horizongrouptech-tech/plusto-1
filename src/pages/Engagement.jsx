import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

const EngagementDashboard = lazy(() => import('../components/admin/EngagementDashboard'));

export default function EngagementPage() {
  return (
    <div className="p-6 space-y-6">
      <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-horizon-primary" /></div>}>
        <EngagementDashboard />
      </Suspense>
    </div>
  );
}
