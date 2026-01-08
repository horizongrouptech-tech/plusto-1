import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";

export default function ProductSelector({ products, selectedProducts, onChange, multiSelect = true }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredProducts = products.filter(p =>
    p.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleProduct = (productName) => {
    if (multiSelect) {
      const newSelection = selectedProducts.includes(productName)
        ? selectedProducts.filter(p => p !== productName)
        : [...selectedProducts, productName];
      onChange(newSelection);
    } else {
      onChange([productName]);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    onChange(products.map(p => p.product_name));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-horizon-text">בחר מוצרים לניתוח</Label>
      
      {/* תצוגת מוצרים נבחרים */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedProducts.map(productName => (
          <Badge key={productName} className="bg-horizon-primary text-white px-3 py-1">
            {productName}
            <X 
              className="w-3 h-3 mr-1 cursor-pointer hover:text-red-300" 
              onClick={() => handleToggleProduct(productName)}
            />
          </Badge>
        ))}
      </div>

      {/* חיפוש ובחירה */}
      <div className="relative">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
          <Input
            placeholder="חפש מוצר..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="pr-10 bg-horizon-card border-horizon text-horizon-text"
          />
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-horizon-card border border-horizon rounded-lg shadow-lg max-h-64 overflow-y-auto">
            <div className="p-2 border-b border-horizon flex gap-2">
              <Button size="sm" onClick={handleSelectAll} className="flex-1 text-xs">
                בחר הכל
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearAll} className="flex-1 text-xs border-horizon">
                נקה הכל
              </Button>
            </div>
            
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => handleToggleProduct(product.product_name)}
                className={`p-3 cursor-pointer hover:bg-horizon-primary/10 transition-colors ${
                  selectedProducts.includes(product.product_name) ? 'bg-horizon-primary/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-horizon-text text-sm">{product.product_name}</span>
                  {selectedProducts.includes(product.product_name) && (
                    <Badge className="bg-horizon-primary text-white">✓</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}