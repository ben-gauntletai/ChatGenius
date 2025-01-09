import { useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { MessageSquare } from 'lucide-react'

interface SearchResult {
  id: string
  content: string
  channelId: string
  channelName: string
  createdAt: string
}

interface SearchDropdownProps {
  results: SearchResult[]
  isLoading: boolean
  onClose: () => void
}

export default function SearchDropdown({ results, isLoading, onClose }: SearchDropdownProps) {
  const router = useRouter()
  const params = useParams() as { workspaceId: string }
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleSelectMessage = (channelId: string, messageId: string) => {
    router.push(`/${params.workspaceId}/${channelId}?messageId=${messageId}`)
    onClose()
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50"
    >
      {isLoading ? (
        <div className="p-4 text-center text-gray-500">
          Searching...
        </div>
      ) : results.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No results found
        </div>
      ) : (
        <div className="py-2">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelectMessage(result.channelId, result.id)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <div className="flex items-start space-x-3">
                <MessageSquare className="h-4 w-4 text-gray-400 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{result.content}</p>
                  <p className="text-xs text-gray-500">
                    #{result.channelName} • {new Date(result.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 