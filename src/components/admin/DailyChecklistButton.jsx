import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, Eye } from 'lucide-react';
import Ofek360Modal from '@/components/admin/Ofek360Modal';
import DailyChecklist360 from '@/components/admin/DailyChecklist360';

export default function DailyChecklistButton({ customer, isOpen = false, onOpenChange }) {
  const [showOfek360, setShowOfek360] = useState(isOpen);

  if (!customer) return null;

  return (
    <>
      <Button
        onClick={() => setShowOfek360(true)}
        className="bg-gradient-to-r from-horizon-primary to-horizon-secondary hover:from-horizon-primary/90 hover:to-horizon-secondary/90 text-white h-12 w-full gap-2"
      >
        <Target className="w-5 h-5" />
        <Eye className="w-5 h-5" />
        צ'ק ליסט יומי - אופק 360
      </Button>

      {showOfek360 && (
        <Ofek360Modal
          customer={customer}
          isOpen={showOfek360}
          onClose={() => {
            setShowOfek360(false);
            onOpenChange?.(false);
          }}
        />
      )}
    </>
  );
}