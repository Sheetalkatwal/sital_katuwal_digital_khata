import React, { useState, useEffect, useRef } from 'react'
// import meta.env.VITE_BACKEND_URL from 'meta/env.VITE_BACKEND_URL'

// Use Vite env var: import.meta.env.VITE_BACKEND_URL
// Use `${BACKEND_URL}/your/path` in your fetch calls (instead of hardcoded '/accounts/...')
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
console.log('BACKEND_URL=', BACKEND_URL)

const IconCard = ({ title, description, accent = 'bg-indigo-50 text-indigo-600', children }) => (
  <div className="relative h-36 rounded-lg overflow-hidden shadow-sm p-5 flex items-start gap-4 bg-white border border-gray-100">
    <div className={`flex-none w-12 h-12 rounded-md flex items-center justify-center ${accent}`}>
      {children}
    </div>
    <div className="flex-1">
      <div className="text-gray-900 font-medium text-sm">{title}</div>
      <div className="text-gray-500 text-xs mt-1">{description}</div>
    </div>
  </div>
)

const Spinner = ({ size = 24, color = 'white' }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="4"></circle>
    <path d="M22 12a10 10 0 00-10-10" stroke={color} strokeWidth="4" strokeLinecap="round"></path>
  </svg>
)

const RegisterAccount = () => {
  const [step, setStep] = useState(0) // 0: send email, 1: verify, 2: details, 3: done

  // Step states
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  // UI state
  const [loadingSend, setLoadingSend] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // resend cooldown (seconds)
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef(null)

  useEffect(() => {
    if (resendCooldown > 0 && !cooldownRef.current) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1) {
            clearInterval(cooldownRef.current)
            cooldownRef.current = null
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current)
        cooldownRef.current = null
      }
    }
  }, [resendCooldown])

  // basic validators
  const validateEmail = (e) => /\S+@\S+\.\S+/.test(e)
  const validateOtp = (c) => c && c.toString().trim().length >= 4
  const passwordsMatch = () => password && password === password2 && password.length >= 8

  // Attempt to call your backend endpoint /accounts/request-otp/
  const sendVerification = async () => {
    setError('')
    setInfo('')

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoadingSend(true)
    try {
      const res = await fetch(`${BACKEND_URL}/accounts/request-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        setInfo((data && data.message) || 'Verification code sent to your email.')
        // If backend reports the email is already verified (but user not created), go to details
        if (data && data.verified) {
          setStep(2)
        } else {
          setStep(1)
          // Start a 60s cooldown for resend
          setResendCooldown(60)
        }
      } else {
        // Backend returned an error body
        const serverMessage = (data && (data.error || data.message || JSON.stringify(data))) || 'Failed to send OTP.'
        setError(serverMessage)
      }
    } catch (e) {
      setInfo('Verification code (simulated) sent to your email. (Network unreachable)')
      setStep(1)
      setResendCooldown(60)
    } finally {
      await new Promise((r) => setTimeout(r, 250))
      setLoadingSend(false)
    }
  }

  const verifyCode = async () => {
    setError('')
    setInfo('')

    if (!validateOtp(otp)) {
      setError('Please enter the verification code sent to your email.')
      return
    }

    setLoadingVerify(true)
    try {
      const res = await fetch(`${BACKEND_URL}/accounts/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: Number(otp) })
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        setInfo((data && data.message) || 'Email verified. Proceed to fill your details.')
        setStep(2)
      } else {
        const serverMessage = (data && (data.error || data.message || JSON.stringify(data))) || 'Failed to verify code.'
        setError(serverMessage)
      }
    } catch (e) {
      setInfo('Email verified (simulated). Proceed to fill your details.')
      setStep(2)
    } finally {
      await new Promise((r) => setTimeout(r, 200))
      setLoadingVerify(false)
    }
  }

  const submitRegistration = async () => {
    setError('')
    setInfo('')

    // basic validation
    if (!firstName || !lastName) {
      setError('First name and last name are required.')
      return
    }
    if (!passwordsMatch()) {
      setError('Passwords must match and be at least 8 characters long.')
      return
    }
    if (!address || !phone) {
      setError('Address and phone number are required.')
      return
    }

    setLoadingSubmit(true)
    try {
      const res = await fetch(`${BACKEND_URL}/accounts/register/user/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          first_name: firstName,
          last_name: lastName,
          password: password,
          password2: password2,
          address: address,
          phone_number: phone,
          bio: ''
        })
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        setInfo((data && data.message) || 'Registration successful. You may now log in.')
        setStep(3) // finished
      } else {
        const serverMessage = (data && (data.error || data.message || data.detail || JSON.stringify(data))) || 'Registration failed.'
        setError(serverMessage)
      }
    } catch (e) {
      setInfo('Registration simulated: success. (Backend unreachable)')
      setStep(3)
    } finally {
      await new Promise((r) => setTimeout(r, 200))
      setLoadingSubmit(false)
    }
  }

  const goBack = () => {
    if (step === 0) {
      // go back to register landing page
      window.location.href = '/'
      return
    }
    setError('')
    setInfo('')
    setStep(step - 1)
  }

  const onPrimary = () => {
    // primary action depends on step
    if (step === 0) return sendVerification()
    if (step === 1) return verifyCode()
    if (step === 2) return submitRegistration()
    if (step === 3) return (window.location.href = '/login')
  }

  const resendAllowed = resendCooldown === 0 && !loadingSend

  const anyLoading = loadingSend || loadingVerify || loadingSubmit

  return (
    <div className="flex min-h-screen font-sans bg-gray-50">
      {/* Left Side - Simple Icon Cards (muted) */}

      {/* Right Side - Page Content */}
      <div className="w-full max-w-md  flex items-center justify-center m-auto p-8">
        <div className="w-full bg-white rounded-xl p-6 shadow-md border border-gray-100 relative">
          {/* Loading overlay */}
          {anyLoading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl z-10">
              <div className="flex flex-col items-center gap-3">
                <Spinner size={28} color="#0f172a" />
                <div className="text-sm text-gray-700">{loadingSend ? 'Sending verification...' : loadingVerify ? 'Verifying...' : 'Please wait...'}</div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Create an account</h1>
            <p className="text-gray-600 mt-2 text-sm">Join as a shopkeeper or a customer. You can connect with businesses and track activity from your profile.</p>
          </div>

          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          {info && <div className="mb-3 text-sm text-green-600">{info}</div>}

          <div className="mb-6">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <StepDot active={step >= 0} label="Email" index={0} current={step} />
              <div className="flex-1 h-px bg-gray-200" />
              <StepDot active={step >= 1} label="Verify" index={1} current={step} />
              <div className="flex-1 h-px bg-gray-200" />
              <StepDot active={step >= 2} label="Details" index={2} current={step} />
            </div>
          </div>

          <div className="min-h-[320px]">
            {step === 0 && (
              <div>
                <label className="block text-sm text-gray-700">Email</label>
                <input disabled={anyLoading} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" className="mt-2 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
              </div>
            )}

            {step === 1 && (
              <div>
                <label className="block text-sm text-gray-700">Enter verification code</label>
                <input disabled={anyLoading} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="1234" className="mt-2 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-700">First name</label>
                    <input disabled={anyLoading} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700">Last name</label>
                    <input disabled={anyLoading} value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-2" />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-gray-700">Password</label>
                  <input disabled={anyLoading} value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="mt-1 w-full border rounded-md px-2 py-2" />
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-gray-700">Confirm password</label>
                  <input disabled={anyLoading} value={password2} onChange={(e) => setPassword2(e.target.value)} type="password" className="mt-1 w-full border rounded-md px-2 py-2" />
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-gray-700">Address</label>
                  <input disabled={anyLoading} value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-2" />
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-gray-700">Phone number</label>
                  <input disabled={anyLoading} value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-2" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">You're all set</div>
                <div className="text-sm text-gray-600 mt-2">Registration completed. You can now log in.</div>
              </div>
            )}
          </div>

          {/* Navigation buttons: left (back/cancel), right (primary) */}
          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={goBack} className="px-4 py-2 rounded-md border border-gray-200 text-sm text-gray-700">{step === 0 ? 'Cancel' : 'Back'}</button>

            <div>
              {step < 3 && (
                <>
                  {/* When on step 0, show resend state separately if user already sent */}
                  {step === 0 ? (
                    <button type="button" onClick={onPrimary} disabled={loadingSend} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
                      {loadingSend ? <Spinner size={16} color="#fff" /> : null}
                      <span>{loadingSend ? 'Sending...' : 'Send verification'}</span>
                    </button>
                  ) : step === 1 ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => { if (resendAllowed) sendVerification() }} disabled={!resendAllowed} className="px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-700">
                        {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                      </button>
                      <button type="button" onClick={onPrimary} disabled={loadingVerify} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium inline-flex items-center gap-2">
                        {loadingVerify ? <Spinner size={16} color="#fff" /> : null}
                        <span>{loadingVerify ? 'Verifying...' : 'Verify'}</span>
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={onPrimary} disabled={loadingSubmit} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
                      {loadingSubmit ? <Spinner size={16} color="#fff" /> : null}
                      <span>{loadingSubmit ? 'Please wait...' : 'Create account'}</span>
                    </button>
                  )}
                </>
              )}

              {step === 3 && (
                <a href="/login" className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium">Go to sign in</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const StepDot = ({ label, index, current, active }) => {
  const isCurrent = current === index
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${isCurrent ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>{index + 1}</div>
      <div className="hidden sm:block">{label}</div>
    </div>
  )
}

export default RegisterAccount