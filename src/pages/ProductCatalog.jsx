import React, { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Package } from "lucide-react";
import ProductCatalogManager from "@/components/catalog/ProductCatalogManager";
import { User } from '@/api/entities';

export default function ProductCatalog() {
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
      <div className="min-h-screen bg-horizon-dark p-6 flex items-center justify-center">
        <div className="text-horizon-text">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horizon-dark p-6 text-horizon-text">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="icon" className="rounded-xl border-horizon text-horizon-text hover:bg-horizon-card">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-horizon-text flex items-center gap-3">
              <Package className="w-8 h-8 text-horizon-primary" />
              קטלוג מוצרים חכם
            </h1>
            <p className="text-horizon-accent mt-1">ניהול מוצרים מקצועי עם חישובי רווח אוטומטיים</p>
          </div>
        </div>

        <ProductCatalogManager 
          customer={user}
          isAdmin={false}
        />
      </div>
    </div>
  );
}