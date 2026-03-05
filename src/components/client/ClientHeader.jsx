import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

/**
 * ClientHeader — header ללקוח נבחר בדף Clients.
 * מציג: שם עסק, שם מלא, אימייל, סוג עסק, badge קבוצה A/B.
 */
export default function ClientHeader({ customer }) {
  if (!customer) return null;

  const groupColors = {
    A: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    B: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <div className="bg-horizon-card border-b border-horizon px-6 py-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* אייקון עסק */}
          <div className="w-10 h-10 rounded-xl bg-horizon-primary/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-horizon-primary" />
          </div>

          {/* שם + פרטים */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-horizon-text">
                {customer.business_name || "ללא שם עסק"}
              </h2>
              {customer.customer_group && (
                <Badge
                  variant="outline"
                  className={`text-xs ${groupColors[customer.customer_group] || "border-horizon text-horizon-accent"}`}
                >
                  קבוצה {customer.customer_group}
                </Badge>
              )}
            </div>
            <p className="text-sm text-horizon-accent">
              {customer.full_name} &bull; {customer.email}
              {customer.business_type && (
                <span> &bull; {customer.business_type}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
