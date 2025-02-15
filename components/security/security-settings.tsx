"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Icons } from '@/components/ui/icons'
import { TwoFactorDialog } from './two-factor-dialog'
import { SecurityQuestionsDialog } from './security-questions-dialog'
import { DeviceHistory } from './device-history'

interface SecuritySettingsProps {
  profile: {
    two_factor_enabled: boolean
    email_notifications: boolean
    login_alerts: boolean
    transaction_alerts: boolean
  }
}

export function SecuritySettings({ profile }: SecuritySettingsProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(profile.two_factor_enabled)
  const [emailNotifications, setEmailNotifications] = useState(profile.email_notifications)
  const [loginAlerts, setLoginAlerts] = useState(profile.login_alerts)
  const [transactionAlerts, setTransactionAlerts] = useState(profile.transaction_alerts)
  const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false)
  const [showSecurityQuestionsDialog, setShowSecurityQuestionsDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleDisable2FA = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/disable-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '' }) // Token will be requested in the UI
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      setTwoFactorEnabled(false)
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been disabled.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disable 2FA. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationChange = async (type: string, value: boolean) => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled: value })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      switch (type) {
        case 'email':
          setEmailNotifications(value)
          break
        case 'login':
          setLoginAlerts(value)
          break
        case 'transaction':
          setTransactionAlerts(value)
          break
      }

      toast({
        title: 'Success',
        description: 'Notification settings updated.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
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
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account.
                </p>
              </div>
              {twoFactorEnabled ? (
                <Button
                  variant="destructive"
                  onClick={handleDisable2FA}
                  disabled={loading}
                >
                  {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Disable
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={() => setShowTwoFactorDialog(true)}
                  disabled={loading}
                >
                  Enable
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Security Questions</Label>
                <p className="text-sm text-muted-foreground">
                  Set up questions to help verify your identity.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowSecurityQuestionsDialog(true)}
              >
                Manage
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                  disabled={loading}
                />
                <Label htmlFor="email-notifications">Email Notifications</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="login-alerts"
                  checked={loginAlerts}
                  onCheckedChange={(checked) => handleNotificationChange('login', checked)}
                  disabled={loading}
                />
                <Label htmlFor="login-alerts">Login Alerts</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="transaction-alerts"
                  checked={transactionAlerts}
                  onCheckedChange={(checked) => handleNotificationChange('transaction', checked)}
                  disabled={loading}
                />
                <Label htmlFor="transaction-alerts">Transaction Alerts</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeviceHistory />

      <TwoFactorDialog
        open={showTwoFactorDialog}
        onClose={() => setShowTwoFactorDialog(false)}
        onSuccess={() => setTwoFactorEnabled(true)}
      />

      <SecurityQuestionsDialog
        open={showSecurityQuestionsDialog}
        onClose={() => setShowSecurityQuestionsDialog(false)}
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
