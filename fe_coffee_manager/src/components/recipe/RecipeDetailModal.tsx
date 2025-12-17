import React, { useState, useEffect } from 'react';
import { CatalogRecipe } from '../../types';
import { X, ChefHat, Clock, Info, ListChecks, Coffee } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface Props {
  open: boolean;
  onClose: () => void;
  recipe: CatalogRecipe | null;
  productImageUrl?: string | null;
}

export default function RecipeDetailModal({ open, onClose, recipe, productImageUrl }: Props) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize position when modal opens
  useEffect(() => {
    if (open) {
      setPosition({
        x: window.innerWidth / 2 - 400, // Center horizontally (assuming modal width ~800px)
        y: 50 // 50px from top
      });
    }
  }, [open]);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  if (!open || !recipe) return null;

  const items = recipe.items || [];
  const steps = (recipe.instructions || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute bg-white rounded-xl shadow-2xl transform transition-all pointer-events-auto max-w-4xl w-full max-h-[90vh] flex flex-col"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* Header - Draggable area - Fixed */}
        <div
          className="bg-white px-6 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between cursor-grab active:cursor-grabbing select-none flex-shrink-0"
          onMouseDown={handleMouseDown}
        >
            <div className="flex items-center space-x-3">
              <div className="bg-amber-50 p-2 rounded-lg">
                <ChefHat className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{recipe.name}</h3>
                <div className="text-sm text-gray-500">Recipe ID #{recipe.recipeId}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
              <X className="w-6 h-6" />
            </button>
          </div>

        {/* Content area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            {/* Summary badges */}
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              <span className={`px-2 py-1 rounded text-xs ${recipe.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{recipe.status}</span>
              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">Version {recipe.version}</span>
              <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">Items {items.length}</span>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">Product Detail</div>
                    <div className="mt-1 text-gray-900 font-semibold">PD #{recipe.productDetail?.pdId}</div>
                    <div className="text-sm text-gray-600">Size: {recipe.productDetail?.size?.name || '—'}</div>
                    <div className="text-sm text-gray-600">Price: {recipe.productDetail?.price != null ? Number(recipe.productDetail.price).toLocaleString() : '—'}</div>
                  </div>
                  {productImageUrl && (
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={productImageUrl}
                        alt="Product"
                        className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Category</div>
                <div className="mt-1 text-gray-900 font-semibold">{recipe.category?.name || '—'}</div>
                <div className="text-sm text-gray-600">Yield: {recipe.yield ?? '—'}</div>
              </div>
            </div>

            {/* Description & Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-800 font-semibold"><Info className="w-4 h-4" /> Description</div>
                <div className="mt-2 text-gray-700 text-sm whitespace-pre-wrap">{recipe.description || '—'}</div>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-800 font-semibold"><ListChecks className="w-4 h-4" /> Instructions</div>
                <div className="mt-2 text-gray-700 text-sm space-y-1">
                  {steps.length === 0 ? (
                    <div>—</div>
                  ) : (
                    steps.map((step, idx) => (
                      <div key={idx}><span className="font-semibold">Step {idx + 1}:</span> {step}</div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="bg-white border rounded-lg">
              <div className="px-4 py-3 border-b bg-gray-50 font-semibold">Ingredients</div>
              <div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Ingredient</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      <th className="px-3 py-2 text-left">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2 text-gray-900">{item.ingredient?.name} <span className="text-xs text-gray-500">(#{item.ingredient?.ingredientId})</span></td>
                        <td className="px-3 py-2">{Number(item.qty).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.unit?.name} ({item.unit?.code})</td>
                        <td className="px-3 py-2 text-gray-700">{item.note || '—'}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-gray-500">No ingredients</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Timestamps */}
            <div className="mt-6 pt-4 border-t border-gray-200 pb-4">
              <div className="flex items-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Created: {new Date(recipe.createAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Updated: {new Date(recipe.updateAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}


