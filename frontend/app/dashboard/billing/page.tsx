'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function BillingPage() {
  const { user } = useAuthStore()
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const isPro = user?.subscription_tier === 'pro'

  const handleUpgrade = () => {
    setShowPayment(true)
  }

  const handlePayment = async () => {
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    setPaymentSuccess(true)

    // In a real implementation, this would call the backend API
    // and update the user's subscription tier
  }

  if (paymentSuccess) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
        <p className="text-slate-600 mb-6">
          Your account has been upgraded to Pro. Enjoy unlimited interview sessions!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="text-slate-600 mt-1">Manage your subscription and payment methods</p>
      </div>

      {/* Current plan */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900 capitalize">
              {user?.subscription_tier} Plan
            </p>
            {isPro ? (
              <p className="text-slate-600 mt-1">Unlimited sessions, all features</p>
            ) : (
              <p className="text-slate-600 mt-1">3 sessions, 5 min each</p>
            )}
          </div>
          {isPro && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Plans comparison */}
      {!showPayment && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free tier */}
          <div className={`bg-white rounded-xl p-6 shadow-sm border-2 ${
            !isPro ? 'border-blue-500' : 'border-slate-200'
          }`}>
            <h3 className="text-xl font-bold text-slate-900">Free</h3>
            <p className="text-3xl font-bold text-slate-900 mt-4">
              $0<span className="text-lg font-normal text-slate-500">/month</span>
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-2 text-slate-600">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                3 interview sessions total
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                5 minutes per session
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Requires own Groq API key
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Sessions auto-delete after 24h
              </li>
            </ul>
            {!isPro && (
              <button
                disabled
                className="mt-6 w-full py-3 bg-slate-100 text-slate-500 font-medium rounded-lg"
              >
                Current Plan
              </button>
            )}
          </div>

          {/* Pro tier */}
          <div className={`bg-white rounded-xl p-6 shadow-sm border-2 ${
            isPro ? 'border-blue-500' : 'border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Pro</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                Popular
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-4">
              ₹50<span className="text-lg font-normal text-slate-500">/hour</span>
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-2 text-slate-600">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited sessions
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited duration
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All LLM providers
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Permanent session storage
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Transcript downloads
              </li>
            </ul>
            {isPro ? (
              <button
                disabled
                className="mt-6 w-full py-3 bg-slate-100 text-slate-500 font-medium rounded-lg"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && !isProcessing && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Choose Payment Method</h2>

          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('upi')}
              className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 transition ${
                paymentMethod === 'upi' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-green-700">UPI</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">UPI Payment</p>
                <p className="text-sm text-slate-600">Pay using any UPI app</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 transition ${
                paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">Credit/Debit Card</p>
                <p className="text-sm text-slate-600">Visa, Mastercard, RuPay</p>
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Pro Plan (1 hour)</span>
              <span className="font-medium text-slate-900">₹50</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-slate-600">GST (18%)</span>
              <span className="font-medium text-slate-900">₹9</span>
            </div>
            <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between">
              <span className="font-medium text-slate-900">Total</span>
              <span className="font-bold text-slate-900">₹59</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setShowPayment(false)
                setPaymentMethod(null)
              }}
              className="flex-1 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={!paymentMethod}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              Pay ₹59
            </button>
          </div>

          <p className="mt-4 text-xs text-center text-slate-500">
            This is a demo payment. No actual charges will be made.
          </p>
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Processing Payment</h3>
          <p className="text-slate-600">Please wait while we process your payment...</p>
        </div>
      )}
    </div>
  )
}
