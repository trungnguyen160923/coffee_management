import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <div className="text-sm text-gray-600">
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button 
            onClick={onCancel} 
            disabled={isLoading}
            className={`px-4 py-2 rounded border ${
              isLoading 
                ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            disabled={isLoading}
            className={`px-4 py-2 rounded text-white flex items-center gap-2 ${
              isLoading 
                ? 'bg-red-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;


