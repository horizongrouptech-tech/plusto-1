import React, { useState, useEffect } from "react";

import { ArrowLeft, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WebsiteScanner from "@/components/admin/WebsiteScanner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { User } from '@/api/entities';

export default function WebsiteScanPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-1/2 bg-horizon-card" />
          <Skeleton className="h-64 w-full bg-horizon-card" />
          <Skeleton className="h-32 w-full bg-horizon-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="rounded-xl border-horizon text-horizon-text hover:bg-horizon-card">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-horizon-text flex items-center gap-3">
              <ScanLine className="w-8 h-8 text-horizon-primary" />
              סריקת אתר וניתוח עסקי
            </h1>
            <p className="text-horizon-accent mt-1">נתח את האתר שלך, קבל תובנות על מתחרים וצור המלצות לשיפור הרווחיות.</p>
          </div>
        </div>
        
        {user ? (
          <WebsiteScanner customer={user} />
        ) : (
          <p>טוען פרטי משתמש...</p>
        )}
      </div>
    </div>
  );
}