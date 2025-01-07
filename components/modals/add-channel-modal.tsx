'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface AddChannelModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onChannelCreated: () => void
}

export default function AddChannelModal({ 
  isOpen, 
  onClose, 
  workspaceId,
  onChannelCreated 
}: AddChannelModalProps) {
  const [channelName, setChannelName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/workspaces/${workspaceId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: channelName.toLowerCase().replace(/\s+/g, '-'),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create channel')
      }

      setChannelName('')
      onChannelCreated()
      onClose()
    } catch (error) {
      console.error('Error creating channel:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create a channel</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="channelName" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Channel name
            </label>
            <input
              type="text"
              id="channelName"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3F0E40] focus:border-transparent"
              placeholder="e.g. project-updates"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-[#3F0E40] rounded hover:bg-[#4A154B] disabled:opacity-50"
              disabled={isLoading || !channelName.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 