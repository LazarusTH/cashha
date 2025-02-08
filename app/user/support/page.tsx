'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import { debounce } from 'lodash'

interface Message {
  id: number
  content: string
  sender: 'user' | 'support'
  created_at: string
}

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [supportTyping, setSupportTyping] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [messageType, setMessageType] = useState<'general' | 'technical' | 'billing'>('general')
  const { toast } = useToast()
  const user = supabase.auth.user()

  // Fetch message history
  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/support/messages')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages')
      }

      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch messages',
        variant: 'destructive',
      })
    }
  }

  // Subscribe to real-time chat updates
  useEffect(() => {
    const chatChannel = supabase
      .channel('chat_messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_messages',
        filter: `user_id=eq.${user?.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new])
        }
      })
      .subscribe()

    return () => {
      chatChannel.unsubscribe()
    }
  }, [user])

  // Add typing indicator
  useEffect(() => {
    const typingChannel = supabase
      .channel('typing_status')
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === 'support') {
          setSupportTyping(payload.typing)
        }
      })
      .subscribe()

    return () => {
      typingChannel.unsubscribe()
    }
  }, [])

  const handleTyping = debounce(async (typing: boolean) => {
    await supabase.channel('typing_status').send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user?.id, typing },
    })
  }, 500)

  const validateMessage = (content: string) => {
    if (!content.trim()) {
      throw new Error('Message cannot be empty')
    }

    if (content.length > 1000) {
      throw new Error('Message is too long (maximum 1000 characters)')
    }

    // Check for spam or inappropriate content
    const spamPatterns = [
      /\b(viagra|cialis|casino|lottery|winner)\b/i,
      /\b(buy now|click here|free money)\b/i,
    ]

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        throw new Error('Message contains inappropriate content')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Only JPEG, PNG, and PDF files are allowed',
        variant: 'destructive',
      })
      return
    }

    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
  }

  const uploadFile = async () => {
    if (!selectedFile) return null

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to upload file')
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    handleTyping(e.target.value.length > 0)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    try {
      validateMessage(newMessage)

      let attachmentUrl = null
      if (selectedFile) {
        attachmentUrl = await uploadFile()
      }

      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          type: messageType,
          attachmentUrl,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setNewMessage('')
      setSelectedFile(null)
      setUploadProgress(0)
      handleTyping(false)
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Support Chat</CardTitle>
          <CardDescription>
            Chat with our support team. We typically respond within 1-2 business hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ScrollArea className="h-[400px] p-4 border rounded-lg">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {supportTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                      <p>Support is typing...</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type your message..."
                disabled={loading}
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send'}
              </Button>
              <input type="file" onChange={handleFileSelect} />
              <select value={messageType} onChange={(e) => setMessageType(e.target.value as 'general' | 'technical' | 'billing')}>
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
              </select>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
