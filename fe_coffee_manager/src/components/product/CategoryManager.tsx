import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { catalogService } from '../../services';
import { CatalogCategory } from '../../types';
import ConfirmModal from '../common/ConfirmModal';

interface CategoryManagerProps {
  onClose: () => void;
  onCategoriesUpdated: () => void;
}

export default function CategoryManager({ onClose, onCategoriesUpdated }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CatalogCategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await catalogService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Không thể kết nối')) {
        toast.error('Cannot connect to server. Please check your network connection.');
      } else {
        toast.error(`Cannot load categories: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: CatalogCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Category name is required!');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        await catalogService.updateCategory(editingCategory.categoryId, {
          name: formData.name,
          description: formData.description
        });
        toast.success('Category updated successfully!');
      } else {
        // Create new category
        await catalogService.createCategory({
          name: formData.name,
          description: formData.description
        });
        toast.success('Category created successfully!');
      }

      setShowForm(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
      loadCategories(); // Reload categories list
      onCategoriesUpdated?.();
    } catch (error) {
      console.error('Error saving category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      
      // Show specific error messages based on server response
      if (errorMessage.includes('already exists') || errorMessage.includes('unique')) {
        toast.error('Category name already exists! Please choose a different name.');
      } else if (errorMessage.includes('Không thể kết nối')) {
        toast.error('Cannot connect to server. Please check your network connection.');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
    }
  };

  const handleDeleteClick = (category: CatalogCategory) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      await catalogService.deleteCategory(categoryToDelete.categoryId);
      toast.success('Category deleted successfully!');
      loadCategories(); // Reload categories list
      onCategoriesUpdated?.();
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      
      // Show specific error messages based on server response
      if (errorMessage.includes('currently being used') || errorMessage.includes('in use')) {
        toast.error('Cannot delete category! This category is currently being used in products.');
      } else if (errorMessage.includes('Không thể kết nối')) {
        toast.error('Cannot connect to server. Please check your network connection.');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
  };

  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Hash className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Manage Categories</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {showForm ? (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    placeholder="Enter category name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    placeholder="Enter category description"
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {editingCategory ? 'Update' : 'Create'} Category
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Categories</h3>
              <button
                onClick={handleAddNew}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 font-medium text-gray-700">Description</th>
                    <th className="text-center py-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.categoryId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{category.name}</td>
                      <td className="py-3 text-gray-600">{category.description || '—'}</td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="Edit category"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(category)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Delete category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showDeleteModal}
        title="Delete Category"
        description={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
