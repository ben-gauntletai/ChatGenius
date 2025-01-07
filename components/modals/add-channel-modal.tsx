'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface AddChannelModalProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onChannelAdded: () => void
}

export default function AddChannelModal({ 
  workspaceId, 
  isOpen, 
  onClose,
  onChannelAdded 
}: AddChannelModalProps) {
  const [channelName, setChannelName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: channelName.toLowerCase() }),
      })

      if (!response.ok) throw new Error('Failed to create channel')
      
      const newChannel = await response.json()
      setChannelName('')
      onClose()
      await onChannelAdded()
      router.push(`/${workspaceId}/${newChannel.id}`)
    } catch (error) {
      console.error('Error creating channel:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[400px]">
        <h2 className="text-xl font-bold mb-4">Create a channel</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Channel name"
            className="w-full border rounded px-3 py-2 mb-4"
            disabled={isSubmitting}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#3F0E40] text-white rounded"
              disabled={isSubmitting || !channelName.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 