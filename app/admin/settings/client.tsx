"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

export function SettingsClient() {
  const [settings, setSettings] = useState<Settings>({
    generalWithdrawalLimit: "",
    generalSendingLimit: "",
    maintenanceMode: false,
    minimumDeposit: "",
    maximumDeposit: "",
    minimumWithdrawal: "",
    maximumWithdrawal: "",
    dailyTransactionLimit: "",
    monthlyTransactionLimit: "",
    kycRequired: true,
    supportedBanks: [],
    supportedPaymentMethods: [],
    emailNotifications: true,
    smsNotifications: true,
    autoApproveWithdrawals: false,
    autoApproveDeposits: false,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    ipWhitelist: [],
  })
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()

      if (error) throw error

      if (data) {
        setSettings(data)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      toast({
        title: "Error",
        description: "Failed to fetch settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleArraySettingChange = (key: keyof Settings, value: string) => {
    if (Array.isArray(settings[key])) {
      setSettings(prev => ({
        ...prev,
        [key]: value.split(',').map(item => item.trim()),
      }))
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaveLoading(true)
      const { error } = await supabase
        .from('settings')
        .upsert(settings)

      if (error) throw error

      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
    } catch (err) {
      console.error('Error saving settings:', err)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
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

          <div className="flex items-center space-x-2">
            <Switch
              id="kycRequired"
              checked={settings.kycRequired}
              onCheckedChange={(checked) => handleSettingChange('kycRequired', checked)}
            />
            <Label htmlFor="kycRequired">KYC Required</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
            <Input
              id="maxLoginAttempts"
              type="number"
              value={settings.maxLoginAttempts}
              onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
              placeholder="Enter max login attempts"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
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
              placeholder="Enter whitelisted IPs"
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