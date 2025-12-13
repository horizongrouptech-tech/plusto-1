import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage <= totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 mt-6" dir="rtl">
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="border-horizon-accent text-horizon-accent"
      >
         <span className="mr-2">הבא</span>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-horizon-text">
        עמוד {currentPage} מתוך {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="border-horizon-accent text-horizon-accent"
      >
         <ChevronRight className="w-4 h-4" />
        <span className="ml-2">הקודם</span>
      </Button>
    </div>
  );
}