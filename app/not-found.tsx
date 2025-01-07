import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
        <p className="mt-2">The page you're looking for doesn't exist.</p>
      </div>
    </div>
  )
} 