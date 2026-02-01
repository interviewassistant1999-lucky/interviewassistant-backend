'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'

export default function LandingPage() {
  const { user, token } = useAuthStore()
  const isLoggedIn = !!token && !!user

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-slate-900">Interview Assistant</span>
            </div>
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-slate-600 hover:text-slate-900 transition"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/interview"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    Start Interview
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-slate-600 hover:text-slate-900 transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Ace Your Next Interview with
            <span className="text-blue-600"> AI-Powered</span> Coaching
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Get real-time AI suggestions during your interviews. Practice with live feedback,
            transcription, and personalized coaching tailored to your experience.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href={isLoggedIn ? '/interview' : '/signup'}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition shadow-lg shadow-blue-600/25"
            >
              {isLoggedIn ? 'Start Interview' : 'Start Free Trial'}
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 border border-slate-300 text-slate-700 font-semibold rounded-xl text-lg hover:bg-slate-50 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Everything You Need to Succeed
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Live Transcription</h3>
              <p className="text-slate-600">
                See your conversation transcribed in real-time with speaker identification.
                Never miss a question or important detail.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">AI Suggestions</h3>
              <p className="text-slate-600">
                Get intelligent answer suggestions based on your resume and experience.
                Personalized coaching that helps you stand out.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Ultra-Fast Response</h3>
              <p className="text-slate-600">
                Powered by the fastest AI models. Get suggestions in milliseconds,
                right when you need them during your interview.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Add Context', desc: 'Paste your job description and resume' },
              { step: '2', title: 'Start Session', desc: 'Share your screen and microphone' },
              { step: '3', title: 'Get Coaching', desc: 'Receive real-time AI suggestions' },
              { step: '4', title: 'Review & Learn', desc: 'Download transcripts to improve' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-600 text-center mb-12">
            Start free, upgrade when you need more
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900">Free</h3>
              <p className="text-4xl font-bold text-slate-900 mt-4">
                $0<span className="text-lg font-normal text-slate-500">/forever</span>
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  3 interview sessions
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  5 minutes per session
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Use your own API key
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 block w-full py-3 text-center border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
              >
                Get Started Free
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border-2 border-blue-500 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                Popular
              </span>
              <h3 className="text-2xl font-bold text-slate-900">Pro</h3>
              <p className="text-4xl font-bold text-slate-900 mt-4">
                ₹50<span className="text-lg font-normal text-slate-500">/hour</span>
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited sessions
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited duration
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All AI providers
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Permanent storage
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 block w-full py-3 text-center bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Start Pro Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Join thousands of job seekers who improved their interview performance.
          </p>
          <Link
            href={isLoggedIn ? '/interview' : '/signup'}
            className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition shadow-lg shadow-blue-600/25"
          >
            {isLoggedIn ? 'Start Interview Now' : 'Get Started Free'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-sm">
              &copy; 2026 Interview Assistant. All rights reserved.
            </span>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-slate-700">Privacy</a>
              <a href="#" className="hover:text-slate-700">Terms</a>
              <a href="#" className="hover:text-slate-700">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
