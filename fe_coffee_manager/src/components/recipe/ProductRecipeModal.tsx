import React, { useState, useMemo } from 'react';
import { CatalogProduct, CatalogRecipe, CatalogProductDetail } from '../../types';
import { X, ChefHat, Package, DollarSign } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import RecipeDetailModal from './RecipeDetailModal';

interface Props {
  open: boolean;
  onClose: () => void;
  product: CatalogProduct | null;
  recipes: CatalogRecipe[];
}

export default function ProductRecipeModal({ open, onClose, product, recipes }: Props) {
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);

  // Group recipes by productDetail (size)
  const recipesBySize = useMemo(() => {
    const map = new Map<number, CatalogRecipe>();
    recipes.forEach(recipe => {
      if (recipe.productDetail?.pdId) {
        map.set(recipe.productDetail.pdId, recipe);
      }
    });
    return map;
  }, [recipes]);

  // Get selected recipe
  const selectedRecipe = useMemo(() => {
    if (!selectedSizeId) return null;
    return recipesBySize.get(selectedSizeId) || null;
  }, [selectedSizeId, recipesBySize]);

  // Get product image URL
  const productImageUrl = useMemo(() => {
    if (!product?.imageUrl) return null;
    return product.imageUrl.startsWith('http')
      ? product.imageUrl
      : `${API_BASE_URL}/api/catalogs${product.imageUrl}`;
  }, [product]);

  // Get available sizes from product details
  const availableSizes = useMemo(() => {
    if (!product?.productDetails) return [];
    return product.productDetails.filter(pd => pd.active && pd.size);
  }, [product]);

  if (!open || !product) return null;

  const handleSizeClick = (pdId: number) => {
    setSelectedSizeId(pdId);
    if (recipesBySize.has(pdId)) {
      setRecipeModalOpen(true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-4">
              {productImageUrl && (
                <img
                  src={productImageUrl}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                />
              )}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
                {product.category && (
                  <p className="text-sm text-gray-500">{product.category.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Product Info */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-600">{product.description}</p>
                </div>
              )}
              {product.sku && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">SKU</p>
                  <p className="text-sm text-gray-600">{product.sku}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sizes Section */}
          <div className="flex-1 overflow-y-auto p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Sizes</h4>
            {availableSizes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No sizes available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableSizes.map((pd: CatalogProductDetail) => {
                  const hasRecipe = recipesBySize.has(pd.pdId);
                  const isSelected = selectedSizeId === pd.pdId;
                  
                  return (
                    <button
                      key={pd.pdId}
                      onClick={() => handleSizeClick(pd.pdId)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50'
                          : hasRecipe
                          ? 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                          : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      }`}
                      disabled={!hasRecipe}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{pd.size?.name || 'N/A'}</span>
                        {hasRecipe && (
                          <ChefHat className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>{Number(pd.price).toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>
                      {!hasRecipe && (
                        <p className="text-xs text-gray-400 mt-2">No recipe</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          open={recipeModalOpen}
          onClose={() => {
            setRecipeModalOpen(false);
            setSelectedSizeId(null);
          }}
          recipe={selectedRecipe}
          productImageUrl={productImageUrl}
        />
      )}
    </>
  );
}

