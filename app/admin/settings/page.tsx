"use client"
// Backend Integration: This entire file needs to be connected to the backend to fetch, update, and save settings data.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  // Backend Integration: Fetch initial settings data from backend API
  const [settings, setSettings] = useState({
    generalWithdrawalLimit: "",
    generalSendingLimit: "",
    maintenanceMode: false,
  })

  // Backend Integration: Implement a mechanism to send settings updates to the backend.
  const handleSettingChange = (setting: string, value: any) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [setting]: value,
    }))
  }

    const handleSaveSettings = () => {
    // Backend Integration: Save the updated settings to the backend API.
    console.log("Saving settings:", settings)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="generalWithdrawalLimit">General Withdrawal Limit (ETB)</Label>
            <Input
              id="generalWithdrawalLimit"
              type="number"
              value={settings.generalWithdrawalLimit}
              onChange={(e) => handleSettingChange("generalWithdrawalLimit", e.target.value)}
              placeholder="No limit"
            />
          </div>
          <div>
            <Label htmlFor="generalSendingLimit">General Sending Limit (ETB)</Label>
            <Input
              id="generalSendingLimit"
              type="number"
              value={settings.generalSendingLimit}
              onChange={(e) => handleSettingChange("generalSendingLimit", e.target.value)}
              placeholder="No limit"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => handleSettingChange("maintenanceMode", checked)}
            />
            <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
          </div>
          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  )
}

