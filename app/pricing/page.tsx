'use client'

import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useState } from 'react'

interface Plan {
  id: string
  name: string
  price: number
  description: string
  aiMessages: number
  storage: number
  features: string[]
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out',
    aiMessages: 10,
    storage: 1,
    features: ['10 AI Messages/month', '1 GB Storage', 'Basic Support', 'Dashboard Access'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    description: 'For growing projects',
    aiMessages: 1000,
    storage: 10,
    features: ['1000 AI Messages/month', '10 GB Storage', 'Priority Support', 'API Access', 'Advanced Analytics'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2999,
    description: 'For large-scale apps',
    aiMessages: 100000,
    storage: 500,
    features: ['100k AI Messages/month', '500 GB Storage', '24/7 Premium Support', 'Custom Integration', 'Dedicated Manager'],
  },
]

export default function Pricing() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePlanClick = async (plan: Plan) => {
    if (!session?.user) {
      router.push('/auth/sign-up')
      return
    }

    if (plan.price === 0) {
      router.push('/dashboard')
      return
    }

    setSelectedPlan(plan.id)
    setLoading(true)

    try {
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price / 100,
        }),
      })

      const { orderId, amount, currency } = await response.json()

      if (!window.Razorpay) {
        console.error('Razorpay not loaded')
        return
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: 'Cloudynic',
        description: `${plan.name} Plan`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
              }),
            })

            if (verifyResponse.ok) {
              router.push('/dashboard')
              router.refresh()
            }
          } catch (error) {
            console.error('Payment verification failed:', error)
          }
        },
        prefill: {
          email: session.user.email,
          name: session.user.name,
        },
        theme: {
          color: '#3B82F6',
        },
      }

      const razorpay = new (window as any).Razorpay(options)
      razorpay.open()
    } catch (error) {
      console.error('Payment error:', error)
    } finally {
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="text-2xl font-bold text-white hover:text-slate-300">
            Cloudynic
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-400">Choose the perfect plan for your needs. All prices in ₹ (INR).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg border transition-all ${
                plan.id === 'pro'
                  ? 'border-blue-500 bg-slate-800 ring-2 ring-blue-500 scale-105'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              } p-8 flex flex-col`}
            >
              {plan.id === 'pro' && (
                <div className="mb-4">
                  <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    RECOMMENDED
                  </span>
                </div>
              )}

              <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
              <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

              <div className="mb-8">
                <span className="text-5xl font-bold text-white">₹{plan.price}</span>
                <span className="text-slate-400 text-sm ml-2">/month</span>
              </div>

              <div className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handlePlanClick(plan)}
                disabled={loading && selectedPlan === plan.id}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.price === 0
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading && selectedPlan === plan.id ? 'Processing...' : plan.price === 0 ? 'Get Started Free' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-slate-800 rounded-lg p-8 border border-slate-700">
          <h3 className="text-2xl font-bold text-white mb-4">Questions about pricing?</h3>
          <p className="text-slate-400 mb-6">All plans include a secure dashboard, AI chat access, and comprehensive documentation.</p>
          <Link href="/" className="inline-block text-blue-400 hover:text-blue-300 font-medium">
            Contact support →
          </Link>
        </div>
      </div>

      <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
    </main>
  )
}
