'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Settings {
  generalWithdrawalLimit: string
  generalSendingLimit: string
  maintenanceMode: boolean
  minimumDeposit: string
  maximumDeposit: string
  minimumWithdrawal: string
  maximumWithdrawal: string
  dailyTransactionLimit: string
  monthlyTransactionLimit: string
  kycRequired: boolean
  supportedBanks: string[]
  supportedPaymentMethods: string[]
  emailNotifications: boolean
  smsNotifications: boolean
  autoApproveWithdrawals: boolean
  autoApproveDeposits: boolean
  maxLoginAttempts: number
  sessionTimeout: number
  ipWhitelist: string[]
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    generalWithdrawalLimit: '',
    generalSendingLimit: '',
    maintenanceMode: false,
    minimumDeposit: '',
    maximumDeposit: '',
    minimumWithdrawal: '',
    maximumWithdrawal: '',
    dailyTransactionLimit: '',
    monthlyTransactionLimit: '',
    kycRequired: true,
    supportedBanks: [],
    supportedPaymentMethods: [],
    emailNotifications: true,
    smsNotifications: false,
    autoApproveWithdrawals: false,
    autoApproveDeposits: false,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    ipWhitelist: [],
  })
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const { toast } = useToast()

  // Fetch initial settings
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch settings')
      }

      setSettings({
        generalWithdrawalLimit: data.general_withdrawal_limit?.toString() || '',
        generalSendingLimit: data.general_sending_limit?.toString() || '',
        maintenanceMode: data.maintenance_mode || false,
        minimumDeposit: data.minimum_deposit?.toString() || '',
        maximumDeposit: data.maximum_deposit?.toString() || '',
        minimumWithdrawal: data.minimum_withdrawal?.toString() || '',
        maximumWithdrawal: data.maximum_withdrawal?.toString() || '',
        dailyTransactionLimit: data.daily_transaction_limit?.toString() || '',
        monthlyTransactionLimit: data.monthly_transaction_limit?.toString() || '',
        kycRequired: data.kyc_required || true,
        supportedBanks: data.supported_banks || [],
        supportedPaymentMethods: data.supported_payment_methods || [],
        emailNotifications: data.email_notifications || true,
        smsNotifications: data.sms_notifications || false,
        autoApproveWithdrawals: data.auto_approve_withdrawals || false,
        autoApproveDeposits: data.auto_approve_deposits || false,
        maxLoginAttempts: data.max_login_attempts || 5,
        sessionTimeout: data.session_timeout || 30,
        ipWhitelist: data.ip_whitelist || [],
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch settings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (setting: keyof Settings, value: string | boolean | string[] | number) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
    }))
  }

  const handleArraySettingChange = (setting: keyof Settings, value: string) => {
    if (Array.isArray(settings[setting])) {
      const array = settings[setting] as string[]
      const newArray = array.includes(value)
        ? array.filter(item => item !== value)
        : [...array, value]
      handleSettingChange(setting, newArray)
    }
  }

  const validateSettings = () => {
    const errors: string[] = []

    // Validate numeric values
    const numericFields = [
      'generalWithdrawalLimit',
      'generalSendingLimit',
      'minimumDeposit',
      'maximumDeposit',
      'minimumWithdrawal',
      'maximumWithdrawal',
      'dailyTransactionLimit',
      'monthlyTransactionLimit',
    ]

    numericFields.forEach(field => {
      const value = Number(settings[field as keyof Settings])
      if (isNaN(value) || value < 0) {
        errors.push(`${field} must be a valid positive number`)
      }
    })

    // Validate min/max relationships
    if (Number(settings.minimumDeposit) > Number(settings.maximumDeposit)) {
      errors.push('Minimum deposit cannot be greater than maximum deposit')
    }
    if (Number(settings.minimumWithdrawal) > Number(settings.maximumWithdrawal)) {
      errors.push('Minimum withdrawal cannot be greater than maximum withdrawal')
    }

    // Validate arrays
    if (settings.supportedBanks.length === 0) {
      errors.push('At least one bank must be supported')
    }
    if (settings.supportedPaymentMethods.length === 0) {
      errors.push('At least one payment method must be supported')
    }

    // Validate IP whitelist format
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
    settings.ipWhitelist.forEach(ip => {
      if (!ipPattern.test(ip)) {
        errors.push(`Invalid IP address format: ${ip}`)
      }
    })

    return errors
  }

  const handleSaveSettings = async () => {
    setSaveLoading(true)
    try {
      // Validate settings before saving
      const errors = validateSettings()
      if (errors.length > 0) {
        throw new Error(errors.join('\n'))
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      // Notify all admin users about settings change
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'settings_update',
          message: 'System settings have been updated',
        }),
      })

      // If maintenance mode was toggled, handle it specially
      if (data.maintenanceModeChanged) {
        await fetch('/api/system/maintenance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: settings.maintenanceMode,
          }),
        })
      }

      toast({
        title: 'Success',
        description: 'Settings have been saved successfully.',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setSaveLoading(false)
    }
  }

  if (loading) {
    return <div>Loading settings...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
          <CardDescription>
            Configure system-wide settings and limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.maintenanceMode && (
            <Alert variant="warning">
              <AlertTitle>Maintenance Mode Active</AlertTitle>
              <AlertDescription>
                The system is currently in maintenance mode. Users will not be able to perform transactions.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="generalWithdrawalLimit">General Withdrawal Limit</Label>
            <Input
              id="generalWithdrawalLimit"
              type="number"
              value={settings.generalWithdrawalLimit}
              onChange={(e) => handleSettingChange('generalWithdrawalLimit', e.target.value)}
              placeholder="Enter withdrawal limit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="generalSendingLimit">General Sending Limit</Label>
            <Input
              id="generalSendingLimit"
              type="number"
              value={settings.generalSendingLimit}
              onChange={(e) => handleSettingChange('generalSendingLimit', e.target.value)}
              placeholder="Enter sending limit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumDeposit">Minimum Deposit</Label>
            <Input
              id="minimumDeposit"
              type="number"
              value={settings.minimumDeposit}
              onChange={(e) => handleSettingChange('minimumDeposit', e.target.value)}
              placeholder="Enter minimum deposit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maximumDeposit">Maximum Deposit</Label>
            <Input
              id="maximumDeposit"
              type="number"
              value={settings.maximumDeposit}
              onChange={(e) => handleSettingChange('maximumDeposit', e.target.value)}
              placeholder="Enter maximum deposit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumWithdrawal">Minimum Withdrawal</Label>
            <Input
              id="minimumWithdrawal"
              type="number"
              value={settings.minimumWithdrawal}
              onChange={(e) => handleSettingChange('minimumWithdrawal', e.target.value)}
              placeholder="Enter minimum withdrawal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maximumWithdrawal">Maximum Withdrawal</Label>
            <Input
              id="maximumWithdrawal"
              type="number"
              value={settings.maximumWithdrawal}
              onChange={(e) => handleSettingChange('maximumWithdrawal', e.target.value)}
              placeholder="Enter maximum withdrawal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyTransactionLimit">Daily Transaction Limit</Label>
            <Input
              id="dailyTransactionLimit"
              type="number"
              value={settings.dailyTransactionLimit}
              onChange={(e) => handleSettingChange('dailyTransactionLimit', e.target.value)}
              placeholder="Enter daily transaction limit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyTransactionLimit">Monthly Transaction Limit</Label>
            <Input
              id="monthlyTransactionLimit"
              type="number"
              value={settings.monthlyTransactionLimit}
              onChange={(e) => handleSettingChange('monthlyTransactionLimit', e.target.value)}
              placeholder="Enter monthly transaction limit"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="kycRequired"
              checked={settings.kycRequired}
              onCheckedChange={(checked) => handleSettingChange('kycRequired', checked)}
            />
            <Label htmlFor="kycRequired">KYC Required</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportedBanks">Supported Banks</Label>
            <Input
              id="supportedBanks"
              type="text"
              value={settings.supportedBanks.join(', ')}
              onChange={(e) => handleArraySettingChange('supportedBanks', e.target.value)}
              placeholder="Enter supported banks"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportedPaymentMethods">Supported Payment Methods</Label>
            <Input
              id="supportedPaymentMethods"
              type="text"
              value={settings.supportedPaymentMethods.join(', ')}
              onChange={(e) => handleArraySettingChange('supportedPaymentMethods', e.target.value)}
              placeholder="Enter supported payment methods"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="emailNotifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
            />
            <Label htmlFor="emailNotifications">Email Notifications</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="smsNotifications"
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
            />
            <Label htmlFor="smsNotifications">SMS Notifications</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoApproveWithdrawals"
              checked={settings.autoApproveWithdrawals}
              onCheckedChange={(checked) => handleSettingChange('autoApproveWithdrawals', checked)}
            />
            <Label htmlFor="autoApproveWithdrawals">Auto-Approve Withdrawals</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoApproveDeposits"
              checked={settings.autoApproveDeposits}
              onCheckedChange={(checked) => handleSettingChange('autoApproveDeposits', checked)}
            />
            <Label htmlFor="autoApproveDeposits">Auto-Approve Deposits</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
            <Input
              id="maxLoginAttempts"
              type="number"
              value={settings.maxLoginAttempts}
              onChange={(e) => handleSettingChange('maxLoginAttempts', Number(e.target.value))}
              placeholder="Enter max login attempts"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => handleSettingChange('sessionTimeout', Number(e.target.value))}
              placeholder="Enter session timeout"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipWhitelist">IP Whitelist</Label>
            <Input
              id="ipWhitelist"
              type="text"
              value={settings.ipWhitelist.join(', ')}
              onChange={(e) => handleArraySettingChange('ipWhitelist', e.target.value)}
              placeholder="Enter IP whitelist"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
            />
            <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
          </div>

          <Button 
            onClick={handleSaveSettings} 
            disabled={saveLoading}
            className="w-full"
          >
            {saveLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
