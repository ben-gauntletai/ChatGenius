import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-4">Could not find the requested page</p>
      <Link 
        href="/sign-in" 
        className="text-indigo-600 hover:text-indigo-800 underline"
      >
        Return to Sign In
      </Link>
    </div>
  )
} 