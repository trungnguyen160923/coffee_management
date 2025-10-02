import { Coffee, Pencil as Edit, Trash2, Eye, Undo2 } from 'lucide-react';
// import { toast } from 'react-hot-toast';
import { CatalogProduct } from '../../types';

interface ProductListProps {
  products: CatalogProduct[];
  onEdit: (product: CatalogProduct) => void;
  onDelete: (productId: string) => void;
  onView: (product: CatalogProduct) => void;
  onRestore?: (productId: string) => void;
}

export default function ProductList({ products, onEdit, onDelete, onView, onRestore }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Coffee className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">No products found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-4 px-4 font-semibold text-gray-700 w-1/4">Product Name</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-700">Description</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-700">Category</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-700">SKU</th>
            <th className="text-center py-4 px-4 font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const API_BASE = (import.meta as any).env?.API_BASE_URL || 'http://localhost:8000';
            const imageSrc = product.imageUrl && (product.imageUrl.startsWith('http') ? product.imageUrl : `${API_BASE}/api/catalogs${product.imageUrl}`);
            return (
            <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 w-1/4">
                <div className="flex items-center space-x-3">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Coffee className="w-6 h-6 text-amber-600" />
                    </div>
                  )}
                  <span className="font-medium text-gray-900">{product.name}</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <p className="text-gray-600 text-sm line-clamp-2">{product.description || 'No description'}</p>
              </td>
              <td className="py-4 px-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                  {product.category?.name || 'N/A'}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="font-mono text-sm text-gray-600">{product.sku || 'N/A'}</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => onView(product)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onEdit(product)}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  {product.active ? (
                    <button
                      onClick={() => onDelete(product.productId.toString())}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  ) : (
                    onRestore && (
                      <button
                        onClick={() => onRestore(product.productId.toString())}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Restore"
                      >
                        <Undo2 className="w-5 h-5" />
                      </button>
                    )
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
