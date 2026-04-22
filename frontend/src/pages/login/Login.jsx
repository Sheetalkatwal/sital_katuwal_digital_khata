import React, { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const Spinner = ({ size = 20, color = 'white' }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="4"></circle>
    <path d="M22 12a10 10 0 00-10-10" stroke={color} strokeWidth="4" strokeLinecap="round"></path>
  </svg>
)

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [remember, setRemember] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/accounts/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        const access = data?.access
        const refresh = data?.refresh
        // store tokens in localStorage
        if (access) localStorage.setItem('access', access)
        if (refresh) localStorage.setItem('refresh', refresh)
        if (remember) localStorage.setItem('auth_remember', '1')
        setInfo(data?.message || 'Login successful')
        console.log("roles data:",data);
        if(data.role=='shopkeeper'){
          window.location.href = '/dashboard/shopkeeper';
        }
        if(data.role=='user'){
          window.location.href = '/home';
        }
      } else {
        const msg = (data && (data.error || data.message || JSON.stringify(data))) || 'Login failed.'
        setError(msg)
      }
    } catch (e) {
      setError('Network error. Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left panel - marketing */}
        <div className="hidden md:block bg-gradient-to-b from-indigo-600 to-indigo-500 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-3xl font-extrabold mb-2">Welcome back</h2>
          <p className="text-indigo-100 mb-6">Sign in to manage your profile and access your dashboard.</p>

          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 bg-white/20 rounded">✓</span>
              <span className="opacity-90">Secure, password-protected accounts</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 bg-white/20 rounded">✓</span>
              <span className="opacity-90">Access business tools and insights</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 bg-white/20 rounded">✓</span>
              <span className="opacity-90">Easy onboarding for customers and shopkeepers</span>
            </li>
          </ul>
        </div>

        {/* Right panel - form */}
        <div className="bg-white rounded-2xl p-8 shadow border border-gray-100">
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">Sign in to your account</h3>
          <p className="text-sm text-gray-500 mb-6">Use your email and password to continue.</p>

          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          {info && <div className="text-green-600 text-sm mb-3">{info}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-700">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="you@example.com" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs text-gray-700">Password</label>
                <a href="#" className="text-xs text-indigo-600 hover:underline">Forgot?</a>
              </div>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Your password" />
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                <span className="text-gray-600">Remember me</span>
              </label>

              <a href="/register" className="text-sm text-indigo-600 hover:underline">Create account</a>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-3 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {loading ? <Spinner size={18} /> : null}
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">By continuing you agree to our terms and privacy.</div>
        </div>
      </div>
    </div>
  )
}

export default Login
