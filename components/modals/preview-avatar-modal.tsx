'use client';

import { X, Check, Trash2 } from 'lucide-react';

interface PreviewAvatarModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PreviewAvatarModal({
  isOpen,
  imageUrl,
  onClose,
  onConfirm,
}: PreviewAvatarModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-[400px] max-w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Preview Generated Image</h3>
            <p className="text-sm text-gray-500 mt-0.5">Review your AI-generated profile picture</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1.5 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Image Container */}
        <div className="px-6 py-8 bg-gray-50 border-b border-gray-100">
          <div className="relative w-48 h-48 mx-auto">
            {/* Background decorative element */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#3F0E40]/10 to-transparent rounded-2xl" />
            
            {/* Image */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden ring-4 ring-white shadow-xl">
              <img
                src={imageUrl}
                alt="Generated profile picture"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-white">
          <div className="grid grid-cols-2 gap-3">
            {/* Discard Button */}
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Discard</span>
            </button>

            {/* Confirm Button */}
            <button
              onClick={onConfirm}
              className="px-4 py-2.5 bg-[#3F0E40] text-white rounded-lg text-sm font-medium shadow-sm hover:bg-[#4A154B] transition-colors inline-flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span>Use Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 