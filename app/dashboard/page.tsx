'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Code, Settings, MessageSquare } from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  plan_type: 'free' | 'pro' | 'pro_max'
  created_at: string
}

interface Subscription {
  plan_type: 'free' | 'pro' | 'pro_max'
  status: string
  monthly_cost: number
  created_at: string
  renewal_date: string | null
}

interface ApiKey {
  id: string
  api_key: string
  key_name: string
  created_at: string
  is_active: boolean
}

const PLAN_LIMITS = {
  free: { requestsPerDay: 100, requestsPerMin: 1, apiKeys: 1, costPerMonth: 0 },
  pro: { requestsPerDay: 10000, requestsPerMin: 30, apiKeys: 10, costPerMonth: 29 },
  pro_max: { requestsPerDay: 999999, requestsPerMin: 999, apiKeys: 100, costPerMonth: 99 },
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user')
        const data = await response.json()

        if (!data.user) {
          router.push('/auth/login')
          return
        }

        setUser(data.user)

        // Fetch subscription
        try {
          const subResponse = await fetch('/api/subscription/get')
          if (subResponse.ok) {
            const subData = await subResponse.json()
            setSubscription(subData.subscription)
          }
        } catch (err) {
          console.error('Failed to fetch subscription:', err)
        }

        // Fetch API keys
        try {
          const keysResponse = await fetch('/api/keys/list')
          if (keysResponse.ok) {
            const keysData = await keysResponse.json()
            setApiKeys(keysData.keys || [])
          }
        } catch (err) {
          console.error('Failed to fetch API keys:', err)
        }

        setLoading(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/auth/login')
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput
    setMessages([...messages, { role: 'user', content: userMessage }])
    setChatInput('')
    setChatLoading(true)

    try {
      const response = await fetch('/api/chat/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Failed to get response' }])
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Connection failed' }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleGenerateKey = async () => {
    try {
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_name: `Key-${Date.now()}` }),
      })

      if (response.ok) {
        const keysResponse = await fetch('/api/keys/list')
        if (keysResponse.ok) {
          const keysData = await keysResponse.json()
          setApiKeys(keysData.keys || [])
        }
      }
    } catch (err) {
      console.error('Failed to generate key:', err)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <p className="text-center text-muted-foreground">Loading dashboard...</p>
        </div>
      </main>
    )
  }

  const planLimit = user?.plan_type ? PLAN_LIMITS[user.plan_type] : PLAN_LIMITS.free

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-12 gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-balance">DASHBOARD</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Welcome, {user?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 sm:px-6 py-2 border-2 border-foreground font-bold hover:bg-foreground hover:text-background transition-all text-xs sm:text-sm whitespace-nowrap"
          >
            LOGOUT
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-destructive border-2 border-destructive">
            <p className="text-destructive-foreground font-bold">{error}</p>
          </div>
        )}

        <Tabs defaultValue="chat" className="mb-12">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="instructions">Docs</TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <Card className="border-4 border-foreground p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-6 h-6" />
                <h2 className="text-2xl font-bold">AI CHAT</h2>
              </div>
              <p className="text-muted-foreground text-sm mb-6">
                Chat with Cloudynic AI. Your plan allows {planLimit.requestsPerDay} requests per day.
              </p>

              <div className="bg-card border-2 border-foreground p-4 rounded-lg mb-4 h-96 overflow-y-auto space-y-4">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Start a conversation with Cloudynic AI</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-foreground border-2 border-foreground'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground border-2 border-foreground px-4 py-2 rounded-lg">
                      <p className="text-sm">Typing...</p>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask something..."
                  disabled={chatLoading}
                  className="flex-1 px-4 py-2 border-2 border-foreground bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-6 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all disabled:opacity-50"
                >
                  SEND
                </button>
              </form>
            </Card>
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan">
            <Card className="border-4 border-foreground p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6" />
                <h2 className="text-2xl font-bold">CURRENT PLAN</h2>
              </div>

              {subscription ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-foreground pb-4">
                    <span className="font-bold">Plan Type:</span>
                    <Badge variant="default" className="uppercase">
                      {subscription.plan_type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-foreground p-4">
                      <p className="text-xs text-muted-foreground mb-1">Requests per Day</p>
                      <p className="text-2xl font-bold">{planLimit.requestsPerDay.toLocaleString()}</p>
                    </div>
                    <div className="border-2 border-foreground p-4">
                      <p className="text-xs text-muted-foreground mb-1">Requests per Minute</p>
                      <p className="text-2xl font-bold">{planLimit.requestsPerMin}</p>
                    </div>
                    <div className="border-2 border-foreground p-4">
                      <p className="text-xs text-muted-foreground mb-1">API Keys Limit</p>
                      <p className="text-2xl font-bold">{planLimit.apiKeys}</p>
                    </div>
                    <div className="border-2 border-foreground p-4">
                      <p className="text-xs text-muted-foreground mb-1">Monthly Cost</p>
                      <p className="text-2xl font-bold">${planLimit.costPerMonth}</p>
                    </div>
                  </div>

                  <div className="border-t-2 border-foreground pt-4 mt-6">
                    <p className="text-xs text-muted-foreground mb-2">Status: {subscription.status}</p>
                    {subscription.renewal_date && (
                      <p className="text-xs text-muted-foreground">
                        Renewal: {new Date(subscription.renewal_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <Link
                    href="/pricing"
                    className="block mt-6 px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-center text-sm"
                  >
                    UPGRADE PLAN
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm mb-6">You&apos;re on the Free plan.</p>
                  <Link
                    href="/pricing"
                    className="inline-block px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-sm"
                  >
                    VIEW PLANS
                  </Link>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys">
            <Card className="border-4 border-foreground p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Code className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">API KEYS</h2>
                </div>
                <button
                  onClick={handleGenerateKey}
                  disabled={apiKeys.length >= planLimit.apiKeys}
                  className="px-4 py-2 bg-foreground text-background font-bold border-2 border-foreground hover:bg-background hover:text-foreground transition-all text-xs disabled:opacity-50"
                >
                  + GENERATE
                </button>
              </div>

              {apiKeys.length > 0 ? (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="border-2 border-foreground p-4 bg-card">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-muted-foreground">{key.key_name}</p>
                        <Badge variant={key.is_active ? 'default' : 'secondary'}>
                          {key.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs bg-background p-2 border border-foreground mb-2 break-all">
                        {key.api_key}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(key.api_key)
                          setTimeout(() => {
                            alert('Copied to clipboard!')
                          }, 100)
                        }}
                        className="text-xs px-2 py-1 border border-foreground hover:bg-foreground hover:text-background transition-all font-bold"
                      >
                        COPY
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm mb-6">No API keys yet. Generate your first key.</p>
              )}
            </Card>
          </TabsContent>

          {/* Instructions Tab */}
          <TabsContent value="instructions">
            <Card className="border-4 border-foreground p-6">
              <h2 className="text-2xl font-bold mb-6">API INTEGRATION GUIDE</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">1. Get Your API Key</h3>
                  <p className="text-sm text-muted-foreground mb-2">Generate an API key in the &quot;API Keys&quot; tab above.</p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">2. Basic Request</h3>
                  <div className="bg-background border-2 border-foreground p-4 font-mono text-xs overflow-x-auto">
                    {`curl -X POST https://cloudynic.com/api/v1/prompt \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Hello, how are you?"}'`}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">3. Response</h3>
                  <div className="bg-background border-2 border-foreground p-4 font-mono text-xs overflow-x-auto">
                    {`{
  "reply": "I'm doing well, thank you for asking!",
  "remaining": 9999,
  "limit": 10000
}`}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">Rate Limits</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {planLimit.requestsPerMin} request(s) per minute</li>
                    <li>• {planLimit.requestsPerDay.toLocaleString()} requests per day</li>
                    <li>• Rate limit resets daily at 00:00 UTC</li>
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
