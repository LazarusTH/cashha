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
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    generalWithdrawalLimit: '',
    generalSendingLimit: '',
    maintenanceMode: false,
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

  const handleSettingChange = (setting: keyof Settings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
    }))
  }

  const handleSaveSettings = async () => {
    setSaveLoading(true)
    try {
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
