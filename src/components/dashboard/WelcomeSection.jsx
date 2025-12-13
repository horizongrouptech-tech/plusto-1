import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target } from "lucide-react";

export default function WelcomeSection({ user, productCount }) {
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "בוקר טוב";
    if (hour < 18) return "צהריים טובים";
    return "ערב טוב";
  };

  const getPersonalName = () => {
    if (user?.business_name) {
      return user.business_name;
    }
    if (user?.full_name) {
      const firstName = user.full_name.split(' ')[0];
      return firstName;
    }
    return 'שותף';
  };

  return (
    <Card className="card-horizon overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-2 horizon-gradient"></div>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-horizon-accent" />
              <h1 className="text-3xl font-bold text-horizon-text">
                {getTimeGreeting()}, {getPersonalName()}!
              </h1>
            </div>
            <p className="text-lg text-horizon-accent mb-4">
              מוכן לשפר את הרווחיות של העסק שלך?
            </p>
            
            {productCount > 0 && (
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-horizon-primary" />
                <span className="text-horizon-text">
                  מנתח {productCount} מוצרים ומחפש הזדמנויות רווח נוספות עבורך
                </span>
              </div>
            )}
          </div>
          
          <div className="hidden md:block">
            <div className="text-left">
              <Badge variant="outline" className="bg-horizon-card text-horizon-accent border-horizon-primary mb-2">
                {user?.business_type === 'retail' ? 'קמעונאות' :
                 user?.business_type === 'wholesale' ? 'סיטונאות' :
                 user?.business_type === 'manufacturing' ? 'ייצור' :
                 user?.business_type === 'import' ? 'יבוא' :
                 user?.business_type === 'export' ? 'יצוא' :
                 user?.business_type || 'עסק'}
              </Badge>
              <div className="text-sm text-horizon-accent">
                מחובר כעת
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}