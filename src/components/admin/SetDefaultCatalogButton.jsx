import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Star, Loader2 } from "lucide-react";

import { toast } from 'sonner';
import { Catalog } from '@/api/entities';

export default function SetDefaultCatalogButton({ catalog, customerEmail, onSuccess }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSetDefault = async () => {
    if (!confirm(`האם להגדיר את "${catalog.catalog_name}" כקטלוג רשמי?\n\nכל הקטלוגים האחרים של הלקוח יסומנו כלא רשמיים.`)) {
      return;
    }

    setIsUpdating(true);
    try {
      // טען את כל הקטלוגים של הלקוח
      const allCustomerCatalogs = await Catalog.filter({
        customer_email: customerEmail
      });

      // עדכן את כולם ל-false
      for (const cat of allCustomerCatalogs) {
        if (cat.id !== catalog.id) {
          await Catalog.update(cat.id, { is_default: false });
        }
      }

      // עדכן את הקטלוג הנוכחי ל-true ושנה את השם
      await Catalog.update(catalog.id, {
        is_default: true,
        catalog_name: `קטלוג רשמי - ${catalog.catalog_name}`.replace('קטלוג רשמי - קטלוג רשמי', 'קטלוג רשמי')
      });

      toast.success('הקטלוג הוגדר כקטלוג רשמי!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error setting default catalog:', error);
      toast.error('שגיאה בהגדרת קטלוג רשמי: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      onClick={handleSetDefault}
      disabled={isUpdating || catalog.is_default}
      size="sm"
      variant={catalog.is_default ? "default" : "outline"}
      className={catalog.is_default ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"}
    >
      {isUpdating ? (
        <>
          <Loader2 className="w-4 h-4 ml-1 animate-spin" />
          מעדכן...
        </>
      ) : (
        <>
          <Star className={`w-4 h-4 ml-1 ${catalog.is_default ? 'fill-current' : ''}`} />
          {catalog.is_default ? 'קטלוג רשמי' : 'הגדר כרשמי'}
        </>
      )}
    </Button>
  );
}