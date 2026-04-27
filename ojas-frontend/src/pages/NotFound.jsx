import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center">
        <div className="mb-4">
          <h1 className="text-7xl font-mono font-bold text-primary mb-2">404</h1>
          <h2 className="text-3xl font-bold text-textPrimary mb-4">Page Not Found</h2>
        </div>
        <p className="text-textSecondary mb-8 max-w-md">
          The page you are looking for doesn't exist or has been moved to another location.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-white hover:bg-primary/90"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
