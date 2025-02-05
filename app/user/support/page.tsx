"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

type Message = {
  id: number
  sender: "user" | "support"
  content: string
  timestamp: string
}

// Mock chat messages
const initialMessages: Message[] = [
  { id: 1, sender: "support", content: "Hello! How can I assist you today?", timestamp: "14:00" },
]

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      sender: "user",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prevMessages) => [...prevMessages, userMessage])
    setNewMessage("")

    // TODO: Integrate with backend API for chat functionality
    // For now, we'll simulate an auto-reply
    setTimeout(() => {
      const autoReply: Message = {
        id: messages.length + 2,
        sender: "support",
        content: getAutoReply(newMessage),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prevMessages) => [...prevMessages, autoReply])
    }, 1000)
  }

  // TODO: Replace with actual auto-reply logic based on Cashora data
  const getAutoReply = (message: string) => {
    if (message.toLowerCase().includes("deposit")) {
      return "To make a deposit, please go to the Deposit page and follow the instructions there. If you have any specific questions about deposits, feel free to ask."
    } else if (message.toLowerCase().includes("withdraw")) {
      return "For withdrawals, please visit the Withdraw page. Make sure you have sufficient balance and your account is verified. Let me know if you need more information."
    } else if (message.toLowerCase().includes("send")) {
      return "You can send money to other users from the Send Money page. You'll need the recipient's username or email address. Is there anything specific you'd like to know about sending money?"
    } else {
      return "Thank you for your message. A support representative will get back to you shortly. Is there anything else I can help you with in the meantime?"
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customer Support</h1>

      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Chat with Support</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <ScrollArea className="flex-grow mb-4">
            {messages.map((message) => (
              <div key={message.id} className={`mb-4 ${message.sender === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block p-2 rounded-lg ${
                    message.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {message.content}
                </div>
                <div className="text-xs text-gray-500 mt-1">{message.timestamp}</div>
              </div>
            ))}
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="flex">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-grow mr-2"
            />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

