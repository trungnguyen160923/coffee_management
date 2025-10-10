import { useState } from 'react';
import { Coffee, X } from 'lucide-react';
import ProductDetail from '../../product/ProductDetail';
import RecipeDetailModal from '../../recipe/RecipeDetailModal';
import { CatalogProduct, CatalogRecipe } from '../../../types';

interface ProductDetailModalProps {
  open: boolean;
  onClose: () => void;
  product: CatalogProduct | null;
}

export default function ProductDetailModal({ open, onClose, product }: ProductDetailModalProps) {
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<CatalogRecipe | null>(null);

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-50 p-2 rounded-lg">
                  <Coffee className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Product Details</h3>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            <ProductDetail
              product={product}
              onViewRecipe={(recipe) => { setSelectedRecipe(recipe); setRecipeModalOpen(true); }}
            />
          </div>
        </div>
      </div>

      <RecipeDetailModal
        open={recipeModalOpen}
        onClose={() => { setRecipeModalOpen(false); setSelectedRecipe(null); }}
        recipe={selectedRecipe}
      />
    </div>
  );
}


