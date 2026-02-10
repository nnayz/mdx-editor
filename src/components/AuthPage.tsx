import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FaGithub } from 'react-icons/fa'

export function AuthPage() {
  const { signIn, signUp, signInWithGitHub } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (isSignUp) {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email to confirm your account.')
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center p-3">
      <div className="w-full max-w-sm bg-background rounded-xl p-6 shadow-2xl">
        <div className="mb-5">
          <h1 className="text-lg font-semibold tracking-tight">
            {isSignUp ? 'Create account' : 'Sign in'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isSignUp
              ? 'Enter your email to create an account'
              : 'Enter your credentials to access your notes'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-9 text-sm"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className="h-9 text-sm"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          {message && <p className="text-xs text-green-500">{message}</p>}
          <Button type="submit" className="w-full h-9 text-sm" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-[10px]">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-9 text-sm"
          onClick={signInWithGitHub}
          type="button"
        >
          <FaGithub className="mr-2 h-3.5 w-3.5" />
          Continue with GitHub
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null) }}
            className="text-primary hover:underline underline-offset-4 transition-colors duration-150"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
