'use client';

import { X, Check } from 'lucide-react';
import { useState } from 'react';
import PreviewAvatarModal from './preview-avatar-modal';

const styles = [
  'Minimalist',
  'Artistic',
  'Professional',
  'Cartoon',
  'Abstract',
  'Geometric'
];

const colors = [
  'Blue tones',
  'Earth tones',
  'Vibrant colors',
  'Monochrome',
  'Pastel colors',
  'Dark theme'
];

const subjects = [
  'Abstract shapes',
  'Nature elements',
  'Professional symbols',
  'Tech-inspired',
  'Cosmic themes',
  'Minimal patterns'
];

interface GenerateAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated: (imageUrl: string) => void;
}

export default function GenerateAvatarModal({
  isOpen,
  onClose,
  onImageGenerated
}: GenerateAvatarModalProps) {
  const [selectedStyle, setSelectedStyle] = useState(styles[0]);
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [customDetails, setCustomDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch('/api/generate-profile-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          style: selectedStyle,
          color: selectedColor,
          subject: selectedSubject,
          customDetails: customDetails.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      setPreviewUrl(data.imageUrl);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onImageGenerated(previewUrl);
      setIsPreviewOpen(false);
      onClose();
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewUrl(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-full max-h-[90vh] flex flex-col">
          {/* Header Section */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Create AI Profile Picture</h2>
                <p className="text-xs sm:text-sm text-gray-500">Design your perfect profile picture using artificial intelligence</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Instructions */}
            <div className="mt-4 flex items-center space-x-4 text-xs sm:text-sm text-gray-600 bg-[#3F0E40]/5 rounded-lg px-3 py-2">
              <div className="flex-1">
                <p className="font-medium text-[#3F0E40]">How it works:</p>
                <ol className="mt-0.5 space-y-0.5 list-decimal list-inside">
                  <li>Choose your preferred style</li>
                  <li>Select a color scheme</li>
                  <li>Pick a subject matter theme</li>
                  <li>Generate and preview your image</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-6">
            {/* Style Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Choose Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {styles.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`relative p-2 sm:p-3 rounded-lg text-sm border-2 transition-all duration-200 ${
                      selectedStyle === style
                        ? 'border-[#3F0E40] bg-[#3F0E40] text-white shadow-md'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#3F0E40] hover:bg-[#3F0E40]/5'
                    }`}
                  >
                    <span className="block text-xs sm:text-sm">{style}</span>
                    {selectedStyle === style && (
                      <Check className="absolute top-1 right-1 h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Choose Color Scheme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`relative p-2 sm:p-3 rounded-lg text-sm border-2 transition-all duration-200 ${
                      selectedColor === color
                        ? 'border-[#3F0E40] bg-[#3F0E40] text-white shadow-md'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#3F0E40] hover:bg-[#3F0E40]/5'
                    }`}
                  >
                    <span className="block text-xs sm:text-sm">{color}</span>
                    {selectedColor === color && (
                      <Check className="absolute top-1 right-1 h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Choose Subject Matter
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`relative p-2 sm:p-3 rounded-lg text-sm border-2 transition-all duration-200 ${
                      selectedSubject === subject
                        ? 'border-[#3F0E40] bg-[#3F0E40] text-white shadow-md'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#3F0E40] hover:bg-[#3F0E40]/5'
                    }`}
                  >
                    <span className="block text-xs sm:text-sm">{subject}</span>
                    {selectedSubject === subject && (
                      <Check className="absolute top-1 right-1 h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Details Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Additional Details (Optional)
              </label>
              <div className="relative">
                <textarea
                  value={customDetails}
                  onChange={(e) => setCustomDetails(e.target.value)}
                  placeholder="Add specific elements or preferences you'd like to include (e.g., 'include mountains in background' or 'make it futuristic')"
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 text-xs sm:text-sm text-gray-700 placeholder-gray-400
                    focus:outline-none focus:border-[#3F0E40] focus:ring-1 focus:ring-[#3F0E40] transition-colors
                    resize-none h-16 sm:h-20"
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  Optional
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at Bottom */}
          <div className="border-t bg-gray-50 px-4 sm:px-6 py-3 rounded-b-lg">
            <div className="flex justify-end gap-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`px-4 sm:px-6 py-2 bg-[#3F0E40] text-white rounded-lg text-sm font-medium shadow-sm hover:bg-[#4A154B] transition-colors ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isGenerating ? 'Generating...' : 'Generate Image'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewAvatarModal
        isOpen={isPreviewOpen}
        imageUrl={previewUrl || ''}
        onClose={handleClosePreview}
        onConfirm={handleConfirm}
      />
    </>
  );
} 