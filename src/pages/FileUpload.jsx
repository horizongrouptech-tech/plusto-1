import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import CustomerFileUploadManager from "../components/admin/CustomerFileUploadManager";
import { Loader2 } from "lucide-react";

export default function FileUploadPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-horizon-dark flex items-center justify-center" dir="rtl">
        <Loader2 className="animate-spin w-8 h-8 text-horizon-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-horizon-dark flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-horizon-text mb-4">
            נדרש להתחבר למערכת
          </h1>
          <p className="text-horizon-accent">
            כדי לגשת למערכת העלאת הקבצים, יש להתחבר תחילה.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-4 md:p-8">
      <CustomerFileUploadManager customer={user} isAdmin={false} />
    </div>
  );
}