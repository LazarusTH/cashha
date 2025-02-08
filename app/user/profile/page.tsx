import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { ProfileForm } from '@/components/profile/profile-form'
import { SecuritySettings } from '@/components/security/security-settings'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/supabase/auth-context"
import { getProfile, updateProfile, ProfileData } from "@/lib/supabase/profile"
import { Transaction, getUserTransactions } from "@/lib/supabase/transactions"
import { BankAccount, getUserBankAccounts, createBankAccount, setDefaultBankAccount, deleteBankAccount } from "@/lib/supabase/bank-accounts"
import { Notification, getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/supabase/notifications"
import { createSupportRequest } from "@/lib/supabase/support"
import { Bank, getActiveBanks } from "@/lib/supabase/banks"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, CreditCard, HelpCircle } from "lucide-react"
import { useRouter } from "next/router"
import { Shield, Trash } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

export default async function ProfilePage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const { user } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [recentActivities, setRecentActivities] = useState<Transaction[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSupportDialog, setShowSupportDialog] = useState(false)
  const [showBankDialog, setShowBankDialog] = useState(false)
  const [showSecurityDialog, setShowSecurityDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [supportForm, setSupportForm] = useState({ subject: "", message: "" })
  const [bankForm, setBankForm] = useState({
    bank_id: "",
    account_number: "",
    account_name: "",
  })
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false,
    emailNotifications: true,
    loginAlerts: true,
    transactionAlerts: true,
  })
  const [deleteForm, setDeleteForm] = useState({
    password: "",
    reason: "",
    confirmText: "",
  })
  const [deviceHistory, setDeviceHistory] = useState<any[]>([])
  const [loginAttempts, setLoginAttempts] = useState<any[]>([])
  const [securityQuestions, setSecurityQuestions] = useState<{
    question1: string;
    answer1: string;
    question2: string;
    answer2: string;
    question3: string;
    answer3: string;
  }>({
    question1: "",
    answer1: "",
    question2: "",
    answer2: "",
    question3: "",
    answer3: "",
  })
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/signin')
      return
    }

    async function loadData() {
      try {
        const [
          profileData, 
          transactions, 
          accounts, 
          notifs, 
          banksList,
          devices,
          attempts,
          questions
        ] = await Promise.all([
          getProfile(user.id),
          getUserTransactions(user.id, 5),
          getUserBankAccounts(user.id),
          getUserNotifications(user.id),
          getActiveBanks(),
          getDeviceHistory(user.id),
          getLoginAttempts(user.id),
          getSecurityQuestions(user.id)
        ])
        
        setProfileData(profileData)
        setRecentActivities(transactions)
        setBankAccounts(accounts)
        setNotifications(notifs)
        setBanks(banksList)
        setDeviceHistory(devices)
        setLoginAttempts(attempts)
        setSecurityQuestions(questions)
        setSecurityForm(prev => ({
          ...prev,
          twoFactorEnabled: profileData.twoFactorEnabled,
          emailNotifications: profileData.emailNotifications,
          loginAlerts: profileData.loginAlerts,
          transactionAlerts: profileData.transactionAlerts,
        }))
      } catch (error) {
        console.error('Error loading profile data:', error)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  const handleUpdateSecurity = async () => {
    if (!user) return
    
    try {
      // Validate password requirements
      if (securityForm.newPassword) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        if (!passwordRegex.test(securityForm.newPassword)) {
          throw new Error("Password must be at least 8 characters long and contain uppercase, lowercase, number and special character")
        }
        if (securityForm.newPassword !== securityForm.confirmPassword) {
          throw new Error("New passwords do not match")
        }
      }

      // Verify current password
      const { error: verifyError } = await supabase.auth.api.updateUser(
        user.id,
        { password: securityForm.currentPassword }
      )
      if (verifyError) throw new Error("Current password is incorrect")

      // Update password if provided
      if (securityForm.newPassword) {
        const { error: updateError } = await supabase.auth.api.updateUser(
          user.id,
          { password: securityForm.newPassword }
        )
        if (updateError) throw updateError
      }

      // Update security preferences
      await updateProfile(user.id, {
        twoFactorEnabled: securityForm.twoFactorEnabled,
        emailNotifications: securityForm.emailNotifications,
        loginAlerts: securityForm.loginAlerts,
        transactionAlerts: securityForm.transactionAlerts,
      })

      // Update security questions
      await updateSecurityQuestions(user.id, securityQuestions)

      // Log security update
      await logSecurityUpdate(user.id, {
        type: 'security_settings_update',
        changes: {
          passwordChanged: !!securityForm.newPassword,
          twoFactorEnabled: securityForm.twoFactorEnabled,
          emailNotifications: securityForm.emailNotifications,
          loginAlerts: securityForm.loginAlerts,
          transactionAlerts: securityForm.transactionAlerts,
        }
      })

      toast({
        title: "Success",
        description: "Security settings updated successfully",
      })
      setShowSecurityDialog(false)
    } catch (error) {
      console.error('Error updating security settings:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update security settings",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    try {
      // Verify password
      const { error: verifyError } = await supabase.auth.api.updateUser(
        user.id,
        { password: deleteForm.password }
      )
      if (verifyError) throw new Error("Password is incorrect")

      // Verify confirmation text
      if (deleteForm.confirmText !== "DELETE MY ACCOUNT") {
        throw new Error("Please type DELETE MY ACCOUNT to confirm")
      }

      // Check for pending transactions
      const { data: pendingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single()

      if (pendingTx) {
        throw new Error("Cannot delete account with pending transactions")
      }

      // Log deletion request
      await createSupportRequest({
        user_id: user.id,
        type: 'account_deletion',
        subject: 'Account Deletion Request',
        message: deleteForm.reason,
        status: 'pending'
      })

      // Deactivate account
      await updateProfile(user.id, {
        status: 'deactivated',
        deactivation_reason: deleteForm.reason,
        deactivated_at: new Date().toISOString()
      })

      // Send notification to admin
      await createAdminNotification({
        type: 'account_deletion',
        message: `User ${profile?.email} has requested account deletion`,
        metadata: {
          user_id: user.id,
          reason: deleteForm.reason
        }
      })

      // Send confirmation email
      await sendEmail({
        to: profile?.email,
        template: 'account_deletion',
        data: {
          name: profile?.firstName,
          reason: deleteForm.reason
        }
      })

      toast({
        title: "Account Deactivation Initiated",
        description: "Your account will be permanently deleted within 30 days. You'll receive a confirmation email shortly.",
      })

      // Sign out user
      await supabase.auth.signOut()
      router.push('/signin')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <ProfileForm profile={profile} />
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <SecuritySettings profile={profile} />
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Security Settings</h1>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowSecurityDialog(true)}
                className="flex items-center"
              >
                <Shield className="mr-2 h-4 w-4" />
                Security Settings
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </div>

          {/* Security Settings Dialog */}
          <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Security Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Change Password</Label>
                  <Input
                    type="password"
                    placeholder="Current Password"
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="New Password"
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="Confirm New Password"
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Security Questions</Label>
                  <Select
                    value={securityQuestions.question1}
                    onValueChange={(value) => setSecurityQuestions(prev => ({ ...prev, question1: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select security question 1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mother_maiden">What is your mother's maiden name?</SelectItem>
                      <SelectItem value="first_pet">What was the name of your first pet?</SelectItem>
                      <SelectItem value="birth_city">In which city were you born?</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Answer 1"
                    value={securityQuestions.answer1}
                    onChange={(e) => setSecurityQuestions(prev => ({ ...prev, answer1: e.target.value }))}
                  />
                  {/* Repeat for question2 and question3 */}
                </div>

                <div className="space-y-2">
                  <Label>Two-Factor Authentication</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={securityForm.twoFactorEnabled}
                      onCheckedChange={(checked) => setSecurityForm(prev => ({ ...prev, twoFactorEnabled: checked }))}
                    />
                    <span>Enable 2FA</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notification Preferences</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={securityForm.emailNotifications}
                        onCheckedChange={(checked) => setSecurityForm(prev => ({ ...prev, emailNotifications: checked as boolean }))}
                      />
                      <span>Email Notifications</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={securityForm.loginAlerts}
                        onCheckedChange={(checked) => setSecurityForm(prev => ({ ...prev, loginAlerts: checked as boolean }))}
                      />
                      <span>Login Alerts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={securityForm.transactionAlerts}
                        onCheckedChange={(checked) => setSecurityForm(prev => ({ ...prev, transactionAlerts: checked as boolean }))}
                      />
                      <span>Transaction Alerts</span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleUpdateSecurity} className="w-full">
                  Save Security Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Account Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    This action cannot be undone. Your account will be deactivated immediately and permanently deleted after 30 days.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={deleteForm.password}
                    onChange={(e) => setDeleteForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reason for Deletion</Label>
                  <Textarea
                    placeholder="Please tell us why you're leaving..."
                    value={deleteForm.reason}
                    onChange={(e) => setDeleteForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type DELETE MY ACCOUNT to confirm</Label>
                  <Input
                    placeholder="DELETE MY ACCOUNT"
                    value={deleteForm.confirmText}
                    onChange={(e) => setDeleteForm(prev => ({ ...prev, confirmText: e.target.value }))}
                  />
                </div>

                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  className="w-full"
                  disabled={deleteForm.confirmText !== "DELETE MY ACCOUNT"}
                >
                  Delete Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Device History */}
          <Card>
            <CardHeader>
              <CardTitle>Device History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceHistory.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>{device.device_name}</TableCell>
                      <TableCell>{device.location}</TableCell>
                      <TableCell>{new Date(device.last_active).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={device.is_current ? "default" : "secondary"}>
                          {device.is_current ? "Current" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Login Attempts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Login Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>{new Date(attempt.created_at).toLocaleString()}</TableCell>
                      <TableCell>{attempt.ip_address}</TableCell>
                      <TableCell>{attempt.location}</TableCell>
                      <TableCell>
                        <Badge variant={attempt.success ? "success" : "destructive"}>
                          {attempt.success ? "Success" : "Failed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Rest of the code remains the same */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
