import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Search, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ProductCatalogSection({ customer }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch product catalog
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['productCatalog', customer?.email],
    queryFn: async () => {
      if (!customer?.email) return [];
      const items = await base44.entities.ProductCatalog.filter({
        customer_email: customer.email,
        is_active: true
      }, '-created_date');
      return items;
    },
    enabled: !!customer?.email
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm || 
        p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  if (!isExpanded) {
    return (
      <Card className="card-horizon cursor-pointer" onClick={() => setIsExpanded(true)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-horizon-primary" />
              קטלוג מוצרים ({products.length})
            </CardTitle>
            <ChevronDown className="w-5 h-5 text-horizon-accent" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="card-horizon">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(false)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-horizon-text flex items-center gap-2 text-base">
            <Package className="w-5 h-5 text-horizon-primary" />
            קטלוג מוצרים ({products.length})
          </CardTitle>
          <ChevronUp className="w-5 h-5 text-horizon-accent" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-horizon-accent">טוען מוצרים...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-4 text-horizon-accent">אין מוצרים בקטלוג</div>
        ) : (
          <>
            {/* Search */}
            <div className="space-y-2">
              <Label className="text-horizon-text text-sm">חיפוש</Label>
              <div className="relative">
                <Search className="absolute right-3 top-3 w-4 h-4 text-horizon-accent" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חיפוש מוצר..."
                  className="bg-horizon-card border-horizon text-horizon-text pr-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-horizon-text text-sm">קטגוריה</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-horizon-primary text-white'
                        : 'bg-horizon-card border border-horizon text-horizon-text'
                    }`}
                  >
                    הכל
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        selectedCategory === cat
                          ? 'bg-horizon-primary text-white'
                          : 'bg-horizon-card border border-horizon text-horizon-text'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Info */}
            <div className="text-xs text-horizon-accent">
              {filteredProducts.length} מוצר מתוך {products.length}
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b border-horizon">
                    <th className="p-2 text-horizon-accent font-medium">שם מוצר</th>
                    <th className="p-2 text-horizon-accent font-medium hidden md:table-cell">קטגוריה</th>
                    <th className="p-2 text-horizon-accent font-medium hidden lg:table-cell">מחיר</th>
                    <th className="p-2 text-horizon-accent font-medium hidden lg:table-cell">מלאי</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.slice(0, 20).map((product, idx) => (
                    <tr
                      key={product.id || idx}
                      className="border-b border-horizon/30 hover:bg-horizon-card/30 transition-colors"
                    >
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span className="text-horizon-text font-medium">{product.product_name}</span>
                          {product.description && (
                            <span className="text-xs text-horizon-accent">{product.description.substring(0, 40)}...</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 hidden md:table-cell text-horizon-accent text-xs">{product.category}</td>
                      <td className="p-2 hidden lg:table-cell text-horizon-text">
                        {product.selling_price ? `₪${product.selling_price.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-2 hidden lg:table-cell text-horizon-accent text-xs">
                        {product.inventory !== undefined ? `${product.inventory} יח'` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length > 20 && (
                <div className="text-center py-3 text-xs text-horizon-accent">
                  ועוד {filteredProducts.length - 20} מוצרים...
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}