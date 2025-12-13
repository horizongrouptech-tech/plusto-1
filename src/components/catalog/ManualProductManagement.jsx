
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Edit, Edit3, Plus } from "lucide-react";
import { ProductCatalog } from "@/entities/ProductCatalog";
import ProductAddForm from './ProductAddForm';
import ProductEditModal from './ProductEditModal';
import { cn } from "@/lib/utils"; // Assuming cn utility is available for styling

export default function ManualProductManagement({ customer, selectedCatalogId, disabled }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  // Renamed from showAddProductForm to showAddForm as per outline
  const [showAddForm, setShowAddForm] = useState(false);

  const validateProduct = (product) => {
    const errors = {};
    
    if (!product.product_name || product.product_name.trim() === '') {
      errors.product_name = 'שם המוצר חובה';
    }
    
    // מאפשרים מחיר קנייה 0
    if (product.cost_price === '' || product.cost_price === null || product.cost_price === undefined) {
      errors.cost_price = 'מחיר קנייה חובה (ניתן להזין 0)';
    } else if (isNaN(parseFloat(product.cost_price))) {
      errors.cost_price = 'מחיר קנייה חייב להיות מספר';
    }
    
    // מאפשרים מחיר מכירה 0
    if (product.selling_price === '' || product.selling_price === null || product.selling_price === undefined) {
      errors.selling_price = 'מחיר מכירה חובה (ניתן להזין 0)';
    } else if (isNaN(parseFloat(product.selling_price))) {
      errors.selling_price = 'מחיר מכירה חייב להיות מספר';
    }

    return errors;
  };

  const loadProducts = useCallback(async () => {
    if (!selectedCatalogId || !customer?.email) {
      setProducts([]);
      return;
    }
    setIsLoading(true);
    try {
      const catalogData = await ProductCatalog.filter({
        customer_email: customer.email,
        catalog_id: selectedCatalogId,
        is_active: true
      }, "-created_date");
      setProducts(catalogData);
    } catch (error) {
      console.error("Error loading products for manual management:", error);
      alert("שגיאה בטעינת המוצרים.");
    } finally {
      setIsLoading(false);
    }
  }, [customer?.email, selectedCatalogId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Renamed from handleNewProductAdded to handleProductAdded as per outline
  const handleProductAdded = async (newProduct) => {
    // רענן את רשימת המוצרים לאחר הוספה
    await loadProducts();
    setShowAddForm(false); // Close the add form after successful addition
  };

  const handleUpdateProduct = async (updatedProduct) => {
    const errors = validateProduct(updatedProduct);
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.values(errors).join('\n');
      alert("שגיאות עדכון מוצר:\n" + errorMessages);
      return;
    }

    try {
      // Ensure numeric fields are converted to numbers if they exist
      const productToSave = { ...updatedProduct };
      if (productToSave.cost_price !== '' && productToSave.cost_price !== null && productToSave.cost_price !== undefined) {
        productToSave.cost_price = parseFloat(productToSave.cost_price);
      }
      if (productToSave.selling_price !== '' && productToSave.selling_price !== null && productToSave.selling_price !== undefined) {
        productToSave.selling_price = parseFloat(productToSave.selling_price);
      }

      await ProductCatalog.update(updatedProduct.id, productToSave);
      setShowEditModal(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      alert("שגיאה בעדכון המוצר: " + error.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את המוצר?")) return;
    try {
      await ProductCatalog.update(productId, { is_active: false });
      await loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("שגיאה במחיקת המוצר: " + error.message);
    }
  };
  
  const formatPrice = (price) => {
    // If price is null or undefined or an empty string, display '-'
    if (price === null || price === undefined || price === '') return '-';
    // If price is 0, display ₪0.00
    if (typeof price === 'number') {
        return `₪${price.toFixed(2)}`;
    }
    // Try to parse it as a number, if successful, format it
    const parsedPrice = parseFloat(price);
    if (!isNaN(parsedPrice)) {
      return `₪${parsedPrice.toFixed(2)}`;
    }
    return '-'; // Fallback for invalid non-numeric values
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Replicating CardHeader and CardTitle styling */}
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h2 className={cn(
          "text-2xl font-semibold leading-none tracking-tight",
          "text-horizon-text flex items-center gap-2"
        )}>
          <Edit3 className="w-5 h-5 text-horizon-primary" />
          ניהול והוספה ידנית
        </h2>
      </div>

      {/* Button to open the Add Product Form, as per outline */}
      <Button
        onClick={() => setShowAddForm(true)}
        disabled={disabled || !selectedCatalogId}
        className="btn-horizon-primary w-full"
      >
        <Plus className="w-5 h-5 ml-2" />
        הוסף מוצר חדש
      </Button>

      <div className="border border-horizon rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-horizon">
            <thead className="bg-horizon-card/30">
              <tr>
                {['שם מוצר', 'ברקוד', 'מחיר קנייה', 'מחיר מכירה', 'קטגוריה', 'ספק', 'פעולות'].map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-right text-xs font-medium text-horizon-accent uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-horizon-dark divide-y divide-horizon">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-horizon-primary" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-horizon-accent">
                    אין מוצרים בקטלוג זה. התחל על ידי הוספת מוצר חדש.
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="hover:bg-horizon-card/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-horizon-text text-right">{product.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-horizon-accent text-right">{product.barcode || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-horizon-accent text-right">{formatPrice(product.cost_price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-horizon-accent text-right">{formatPrice(product.selling_price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-horizon-accent text-right">{product.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-horizon-accent text-right">{product.supplier || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingProduct(product); setShowEditModal(true); }}
                          disabled={disabled}
                          className="text-horizon-accent hover:text-horizon-primary"
                          title="ערוך מוצר"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={disabled}
                           className="text-red-500 hover:text-red-400"
                           title="מחק מוצר"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {showAddForm && (
        <ProductAddForm
          customer={customer}
          selectedCatalogId={selectedCatalogId}
          onProductAdded={handleProductAdded}
          isOpen={showAddForm} // Pass state to control form/modal visibility
          onClose={() => setShowAddForm(false)}
          // minimalMode prop removed as it's not in the outline and implies a modal behavior.
        />
      )}

      {showEditModal && editingProduct && (
        <ProductEditModal
          product={editingProduct}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
          }}
          onSave={handleUpdateProduct}
          validateProduct={validateProduct} // Pass validation function to modal
        />
      )}
    </div>
  );
}
