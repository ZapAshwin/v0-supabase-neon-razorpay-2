'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/lib/auth-client'
import { getCurrentUser, getUserSubscription, getUserUsage } from '@/app/actions/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, Code, MessageSquare, BookOpen, LogOut } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const PLAN_FEATURES = {
  free: { aiMessages: 10, storage: 1, price: 0, name: 'Free' },
  pro: { aiMessages: 1000, storage: 10, price: 499, name: 'Pro' },
  enterprise: { aiMessages: 100000, storage: 500, price: 2999, name: 'Enterprise' },
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user) {
        router.push('/auth/login')
        return
      }

      try {
        const [subData, usageData] = await Promise.all([
          getUserSubscription(session.user.id),
          getUserUsage(session.user.id),
        ])
        setSubscription(subData)
        setUsage(usageData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          conversationId: 'dashboard-chat',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to get response. Check your subscription limits.' }])
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const currentPlan = subscription?.planId || 'free'
  const planLimit = PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm">{session.user.email}</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Instructions
            </TabsTrigger>
          </TabsList>

          {/* AI Chat Tab */}
          <TabsContent value="chat" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-slate-800 border-slate-700 p-6 h-[600px] flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-bold text-white">AI Assistant</h2>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-4 mb-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <p>Start a conversation with your AI assistant...</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-100'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-700 text-slate-100 px-4 py-2 rounded-lg">
                          <p className="text-sm">Typing...</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask me anything..."
                      disabled={chatLoading}
                      className="flex-1 px-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </form>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="bg-slate-800 border-slate-700 p-6">
                  <h3 className="font-bold text-white mb-4">Usage</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Messages Used</span>
                        <span className="text-white font-semibold">
                          {usage?.messagesUsed || 0} / {planLimit.aiMessages}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(((usage?.messagesUsed || 0) / planLimit.aiMessages) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="mt-6">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Current Plan</h2>
              </div>

              {subscription ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900 rounded-lg p-4">
                      <p className="text-slate-400 text-xs mb-2">Plan Name</p>
                      <p className="text-white font-bold text-lg">{planLimit.name}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <p className="text-slate-400 text-xs mb-2">AI Messages/Month</p>
                      <p className="text-white font-bold text-lg">{planLimit.aiMessages}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <p className="text-slate-400 text-xs mb-2">Storage</p>
                      <p className="text-white font-bold text-lg">{planLimit.storage} GB</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <p className="text-slate-400 text-xs mb-2">Monthly Price</p>
                      <p className="text-white font-bold text-lg">₹{planLimit.price}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-6">
                    <p className="text-slate-400 text-sm mb-2">Status: <span className="text-green-400 font-semibold">{subscription.status}</span></p>
                    {subscription.renewalDate && (
                      <p className="text-slate-400 text-sm">
                        Renews: {new Date(subscription.renewalDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <Link
                    href="/pricing"
                    className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-center rounded-lg transition-colors"
                  >
                    Upgrade Plan
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-300 mb-6">No active subscription. Start with a plan:</p>
                  <Link
                    href="/pricing"
                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    View Plans
                  </Link>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Instructions Tab */}
          <TabsContent value="docs" className="mt-6">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Integration Guide</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">1. Get API Access</h3>
                  <p className="text-slate-300 text-sm">Upgrade to Pro or Enterprise plan to access API endpoints.</p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3">2. API Endpoint</h3>
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                    <p>POST https://api.example.com/v1/chat</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3">3. Authentication</h3>
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                    <p>{`Headers: { "Authorization": "Bearer YOUR_API_KEY" }`}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3">4. Plan Limits</h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li>• <span className="font-semibold">Free:</span> 10 messages/month</li>
                    <li>• <span className="font-semibold">Pro:</span> 1,000 messages/month</li>
                    <li>• <span className="font-semibold">Enterprise:</span> Unlimited</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
