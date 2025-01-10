import { X, Upload } from 'lucide-react';
import { useState } from 'react';
import DefaultAvatar from '@/components/ui/default-avatar';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  status: string;
  statusText: string;
  onStatusTextChange: (text: string) => void;
  onNameChange: (name: string) => void;
  workspaceId: string;
}

export default function ProfileModal({
  isOpen,
  onClose,
  userId,
  userName,
  status,
  statusText,
  onStatusTextChange,
  onNameChange,
  workspaceId
}: ProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  
  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-500';
      case 'AWAY':
        return 'bg-yellow-500';
      case 'BUSY':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      console.log('Uploading file:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      console.log('Upload response:', data);
      
      if (data.url) {
        console.log('Setting image URL:', data.url);
        setUploadedImageUrl(data.url);
      } else {
        console.error('No URL received in upload response');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      console.log('Saving profile with image:', uploadedImageUrl);
      
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          imageUrl: uploadedImageUrl,
          statusText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      console.log('Profile update response:', data);

      onClose();
    } catch (error) {
      console.error('Error saving profile changes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Your profile</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden">
                {uploadedImageUrl ? (
                  <img
                    src={uploadedImageUrl}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <DefaultAvatar
                    userId={userId}
                    name={userName}
                    className="w-full h-full text-2xl"
                  />
                )}
              </div>
              <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(status)}`} />
            </div>
            
            {/* Upload Button */}
            <label className={`flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md cursor-pointer transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="h-4 w-4" />
              <span className="text-sm">Upload new picture</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Name Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3F0E40] focus:border-transparent text-gray-700"
              disabled={isLoading}
            />
          </div>

          {/* Status Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => onStatusTextChange(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3F0E40] focus:border-transparent text-gray-700"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-[#3F0E40] rounded hover:bg-[#4A154B] transition disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
} 