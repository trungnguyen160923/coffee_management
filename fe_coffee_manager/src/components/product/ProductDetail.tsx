import { Coffee, ChefHat } from 'lucide-react';
import { CatalogProduct, CatalogRecipe } from '../../types';
import { useState, useEffect } from 'react';
import catalogService from '../../services/catalogService';

interface ProductDetailProps {
  product: CatalogProduct;
  onViewRecipe: (recipe: CatalogRecipe) => void;
}

export default function ProductDetail({ product, onViewRecipe }: ProductDetailProps) {
  const [recipesByPdId, setRecipesByPdId] = useState<Record<number, CatalogRecipe[]>>({});

  // Fetch recipes for each product detail
  useEffect(() => {
    const fetchRecipes = async () => {
      if (!product.productDetails) return;
      
      const recipeMap: Record<number, CatalogRecipe[]> = {};
      
      for (const detail of product.productDetails) {
        try {
          const response = await catalogService.searchRecipes({ 
            pdId: detail.pdId, 
            status: 'ACTIVE',
            page: 0, 
            size: 10 
          });
          recipeMap[detail.pdId] = response.content || [];
        } catch (error) {
          console.error(`Failed to fetch recipes for pdId ${detail.pdId}:`, error);
          recipeMap[detail.pdId] = [];
        }
      }
      
      setRecipesByPdId(recipeMap);
    };

    fetchRecipes();
  }, [product.productDetails]);

  const handleViewRecipe = (recipe: CatalogRecipe) => {
    onViewRecipe(recipe);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start space-x-6">
        {product.imageUrl ? (
          <img
            src={(product.imageUrl.startsWith('http')
              ? product.imageUrl
              : `${(import.meta as any).env?.API_BASE_URL || 'http://localhost:8000'}/api/catalogs${product.imageUrl}`)}
            alt={product.name}
            className="w-32 h-32 rounded-xl object-cover shadow-md"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-32 h-32 rounded-xl bg-amber-100 flex items-center justify-center shadow-md">
            <Coffee className="w-16 h-16 text-amber-600" />
          </div>
        )}
        <div className="flex-1">
          <h4 className="text-2xl font-bold text-gray-900 mb-2">{product.name || 'Unnamed Product'}</h4>
          <p className="text-gray-600 mb-3">{product.description || 'No description'}</p>
          <div className="flex items-center space-x-3">
            {product.category && product.category.name && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                {product.category.name}
              </span>
            )}
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                product.active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {product.active ? 'Active' : 'Inactive'}
            </span>
            {product.sku && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                SKU: {product.sku}
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <h5 className="text-lg font-semibold text-gray-900 mb-3">
          {product.productDetails && product.productDetails.some(d => d.size)
            ? 'Price by Size'
            : 'Price'}
        </h5>
        {product.productDetails && product.productDetails.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {product.productDetails.map((detail) => (
              <div
                key={detail.pdId}
                className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 relative"
              >
                {/* Recipe button - top right corner */}
                {recipesByPdId[detail.pdId] && recipesByPdId[detail.pdId].length > 0 && (
                  <button
                    onClick={() => handleViewRecipe(recipesByPdId[detail.pdId][0])}
                    className="absolute top-2 right-2 p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors"
                    title="View Recipe"
                  >
                    <ChefHat className="w-3 h-3" />
                  </button>
                )}
                
                {detail.size ? (
                  <>
                    <div className="text-sm font-medium text-gray-600 mb-1">Size {detail.size.name}</div>
                    {detail.size.description && (
                      <div className="text-xs text-gray-500 mb-2">{detail.size.description}</div>
                    )}
                  </>
                ) : (
                  <div className="text-sm font-medium text-gray-600 mb-1">Price</div>
                )}
                <div className="text-2xl font-bold text-amber-600">
                  {detail.price.toLocaleString('vi-VN')}đ
                </div>
                
                {/* Multiple recipes indicator */}
                {recipesByPdId[detail.pdId] && recipesByPdId[detail.pdId].length > 1 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      +{recipesByPdId[detail.pdId].length - 1} more recipe{recipesByPdId[detail.pdId].length - 1 > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No prices available for this product</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <p className="text-sm text-gray-500 mb-1">Created Date</p>
          <p className="font-medium text-gray-900">
            {product.createAt ? new Date(product.createAt).toLocaleDateString('vi-VN') : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Last Updated</p>
          <p className="font-medium text-gray-900">
            {product.updateAt ? new Date(product.updateAt).toLocaleDateString('vi-VN') : 'N/A'}
          </p>
        </div>
      </div>

    </div>
  );
}
