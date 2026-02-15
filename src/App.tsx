import { useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/AuthPage'
import { EditorLayout } from './components/EditorLayout'
import { Skeleton } from '@/components/ui/skeleton'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-3">
        <div className="relative h-full w-full max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-1.5rem)] bg-background rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* Island skeleton */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <Skeleton className="h-[38px] w-[220px] rounded-full bg-neutral-900" />
          </div>
          <div className="h-11 shrink-0" />
          {/* Header skeleton */}
          <div className="px-4 py-2 flex items-center justify-between">
            <Skeleton className="h-5 w-[140px]" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          {/* Editor + Preview skeleton */}
          <div className="flex-1 min-h-0 flex">
            <div className="flex-1 p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-2/4" />
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 p-4 space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />
  return <EditorLayout />
}

export default App
