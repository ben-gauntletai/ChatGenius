'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteChannelModalProps {
  isOpen: boolean;
  channelName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteChannelModal({
  isOpen,
  channelName,
  onClose,
  onConfirm
}: DeleteChannelModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[400px] max-w-full">
        <div className="flex items-center space-x-2 text-red-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-lg font-semibold">Delete Channel</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-semibold">#{channelName}</span>? 
          This action cannot be undone and all messages will be permanently deleted.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Channel'}
          </button>
        </div>
      </div>
    </div>
  );
} 