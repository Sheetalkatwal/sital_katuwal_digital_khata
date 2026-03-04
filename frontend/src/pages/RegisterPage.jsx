const FeatureCard = ({ title, description, icon }) => (
  <div className="flex flex-col gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:shadow-lg transition-shadow">
    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600">
      {icon}
    </div>

    <div>
      <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
      <p className="text-gray-500 text-xs mt-1">{description}</p>
    </div>
  </div>
)

const RegisterPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900">Digital Khata</div>
          <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-700 transition">
            Sign in
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: Features / Visual */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Join Digital Khata</h1>
              <p className="text-gray-600 text-lg">
                Get started as a shopkeeper or a customer. Manage businesses, track orders, and keep everything
                organised in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeatureCard
                title="For Shopkeepers"
                description="Manage your business, invoices and customers"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a1 1 0 001 1h16a1 1 0 001-1V7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4m-5 4h18" />
                  </svg>
                }
              />

              <FeatureCard
                title="For Customers"
                description="Discover businesses and track your orders"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 10-8 0v4" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 21h14a1 1 0 001-1v-7a4 4 0 00-4-4H8a4 4 0 00-4 4v7a1 1 0 001 1z"
                    />
                  </svg>
                }
              />

              <FeatureCard
                title="Insights"
                description="Monitor sales and customer connections"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 3v18" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 10-16 0 8 8 0 0016 0z" />
                  </svg>
                }
              />

              <FeatureCard
                title="Secure"
                description="Enterprise-grade security for your data"
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 7a2 2 0 114 0v3H10V7z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Right: Registration Form */}
          <div className="lg:sticky lg:top-20">
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Create an account</h2>
                  <p className="text-gray-500 text-sm mt-1">Choose your role to get started with Digital Khata.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <a
                  href="/accounts/register/shopkeeper/"
                  className="flex items-center gap-3 justify-center px-4 py-3 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-shadow shadow"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 opacity-90"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a1 1 0 001 1h16a1 1 0 001-1V7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4m-5 4h18" />
                  </svg>
                  <span>Register as Shopkeeper</span>
                </a>

                <a
                  href="/accounts/register/user/"
                  className="flex items-center gap-3 justify-center px-4 py-3 rounded-lg font-medium bg-white border border-gray-200 hover:shadow-sm transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 10-8 0v4" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 21h14a1 1 0 001-1v-7a4 4 0 00-4-4H8a4 4 0 00-4 4v7a1 1 0 001 1z"
                    />
                  </svg>
                  <span>Register as Customer</span>
                </a>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-gray-600 text-xs">
                  <strong className="text-gray-900">Shopkeepers:</strong> Have your business details ready (name, PAN,
                  address).
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-500 text-xs">
                  Already have an account?{" "}
                  <a href="/login" className="text-indigo-600 font-semibold">
                    Sign in
                  </a>
                </p>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <span>Secure & encrypted</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default RegisterPage
