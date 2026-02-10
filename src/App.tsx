import { useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/AuthPage'
import { EditorLayout } from './components/EditorLayout'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!user) return <AuthPage />
  return <EditorLayout />
}

export default App
