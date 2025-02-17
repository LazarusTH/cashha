"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Icons } from '@/components/ui/icons'
import SecurityQuestionsDialog from './security-questions-dialog'
import { DeviceHistory } from './device-history'

interface UserProfile {
  id: string
  full_name: string
  email: string
  phone_number: string
  email_verified: boolean
  phone_verified: boolean
}

export function SecuritySettings({ profile }: { profile: UserProfile }) {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [transactionAlerts, setTransactionAlerts] = useState(true)
  const { toast } = useToast()

  const handleUpdateSettings = async (setting: string, value: boolean) => {
    try {
      const response = await fetch('/api/user/account/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [setting]: value,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      toast({
        title: 'Success',
        description: 'Security settings updated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage your account security and notification preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about important account activity
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked)
                  handleUpdateSettings('email_notifications', checked)
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Login Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new sign-ins to your account
                </p>
              </div>
              <Switch
                checked={loginAlerts}
                onCheckedChange={(checked) => {
                  setLoginAlerts(checked)
                  handleUpdateSettings('login_alerts', checked)
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Transaction Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for all transactions
                </p>
              </div>
              <Switch
                checked={transactionAlerts}
                onCheckedChange={(checked) => {
                  setTransactionAlerts(checked)
                  handleUpdateSettings('transaction_alerts', checked)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <DeviceHistory />

      <SecurityQuestionsDialog
        open={false}
        onClose={() => {}}
        onSuccess={() => {
          toast({
            title: 'Success',
            description: 'Security questions have been updated.',
          })
        }}
      />
    </div>
  )
}
