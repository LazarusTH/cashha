export const dynamic = "force-dynamic";

'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, CreditCard, HelpCircle, Shield, Trash } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"
import { useToast } from "@/components/ui/use-toast"

export default function ProfilePage() {
  const { user, profile, refreshSession } = useAuth()
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false
  })
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      try {
        router.push('/signin')
      } catch (error) {
        console.error('Navigation error:', error)
        toast({
          title: 'Error',
          description: 'Failed to redirect to signin page',
          variant: 'destructive',
        })
      }
    }
  }, [user, router, toast])

  const handleNotificationChange = async (type: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [type]: !notifications[type as keyof typeof notifications]
        })
      })

      if (!response.ok) throw new Error('Failed to update notification settings')

      setNotifications(prev => ({
        ...prev,
        [type]: !prev[type as keyof typeof notifications]
      }))

      toast({
        title: 'Success',
        description: 'Notification settings updated successfully'
      })
    } catch (error) {
      console.error('Error updating notification settings:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/user/delete', {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete account')

      router.push('/signin')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete account',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
              <Badge variant={user.email_confirmed_at ? "default" : "destructive"}>
                {user.email_confirmed_at ? "Verified" : "Not Verified"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profile.full_name} disabled />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Settings</h3>
              <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive notifications via email
                </div>
                </div>
                    <Switch
                  checked={notifications.email}
                  onCheckedChange={() => handleNotificationChange('email')}
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive push notifications
                  </div>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={() => handleNotificationChange('push')}
                  disabled={loading}
                />
                    </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive notifications via SMS
                  </div>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={() => handleNotificationChange('sms')}
                  disabled={loading}
                />
              </div>
                </div>
                </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Danger Zone</h3>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
              disabled={loading}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
    </div>
  )
}
