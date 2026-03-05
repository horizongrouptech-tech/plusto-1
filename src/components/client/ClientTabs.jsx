import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Lightbulb,
  Package,
  FileText,
  Target,
  Truck,
  DollarSign,
  Building2,
  Calendar,
} from "lucide-react";

const tabs = [
  { id: "files", label: "קבצים וסריקת אתר", icon: FolderOpen },
  { id: "recommendations", label: "המלצות", icon: Lightbulb },
  { id: "catalog", label: "קטלוג", icon: Package },
  { id: "forecast", label: "תוכנית עסקית", icon: FileText },
  { id: "goals", label: "יעדים", icon: Target },
  { id: "suppliers", label: "ספקים", icon: Truck },
  { id: "cashflow", label: "תזרים כספים", icon: DollarSign },
  { id: "org_chart", label: "עץ ארגוני", icon: Building2 },
  { id: "meetings", label: "פגישות", icon: Calendar },
];

/**
 * ClientTabs — tab bar ללקוח נבחר.
 * מציג את כל ה-tabs הזמינים ומסמן את ה-active.
 */
export default function ClientTabs({ activeTab, onTabChange }) {
  return (
    <div className="bg-horizon-card border-b border-horizon px-4 py-2" dir="rtl">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? "default" : "ghost"}
            size="sm"
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-2 whitespace-nowrap ${
              activeTab === id
                ? "bg-horizon-primary text-white"
                : "text-horizon-accent hover:text-horizon-text hover:bg-horizon-dark"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ייצוא רשימת ה-tabs לשימוש חיצוני (validation וכו')
export { tabs };
