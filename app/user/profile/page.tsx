"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
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
  const [supportForm, setSupportForm] = useState({ subject: "", message: "" })
  const [bankForm, setBankForm] = useState({
    bank_id: "",
    account_number: "",
    account_name: "",
  })

  useEffect(() => {
    if (!user) return

    async function loadData() {
      try {
        const [profileData, transactions, accounts, notifs, banksList] = await Promise.all([
          getProfile(user.id),
          getUserTransactions(user.id, 5),
          getUserBankAccounts(user.id),
          getUserNotifications(user.id),
          getActiveBanks()
        ])
        
        setProfile(profileData)
        setRecentActivities(transactions)
        setBankAccounts(accounts)
        setNotifications(notifs)
        setBanks(banksList)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (!profile) return
    setProfile({ ...profile, [name]: value })
  }

  const handleUpdateProfile = async () => {
    if (!user || !profile) return
    setUpdating(true)
    try {
      await updateProfile(user.id, profile)
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleAddBankAccount = async () => {
    if (!user) return
    try {
      const account = await createBankAccount(user.id, bankForm)
      setBankAccounts([account, ...bankAccounts])
      setShowBankDialog(false)
      setBankForm({ bank_id: "", account_number: "", account_name: "" })
      toast({
        title: "Success",
        description: "Bank account added successfully",
      })
    } catch (error) {
      console.error('Error adding bank account:', error)
      toast({
        title: "Error",
        description: "Failed to add bank account",
        variant: "destructive",
      })
    }
  }

  const handleSetDefaultBank = async (id: string) => {
    if (!user) return
    try {
      await setDefaultBankAccount(user.id, id)
      const updatedAccounts = await getUserBankAccounts(user.id)
      setBankAccounts(updatedAccounts)
      toast({
        title: "Success",
        description: "Default bank account updated",
      })
    } catch (error) {
      console.error('Error setting default bank:', error)
      toast({
        title: "Error",
        description: "Failed to set default bank account",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBank = async (id: string) => {
    try {
      await deleteBankAccount(id)
      setBankAccounts(bankAccounts.filter(account => account.id !== id))
      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting bank account:', error)
      toast({
        title: "Error",
        description: "Failed to delete bank account",
        variant: "destructive",
      })
    }
  }

  const handleCreateSupport = async () => {
    if (!user) return
    try {
      await createSupportRequest(user.id, supportForm)
      setShowSupportDialog(false)
      setSupportForm({ subject: "", message: "" })
      toast({
        title: "Success",
        description: "Support request submitted successfully",
      })
    } catch (error) {
      console.error('Error creating support request:', error)
      toast({
        title: "Error",
        description: "Failed to submit support request",
        variant: "destructive",
      })
    }
  }

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications(notifications.map(n => ({ ...n, read: true })))
      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="flex gap-2">
          <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Bell className="h-4 w-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex justify-between">
                  Notifications
                  <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                    Mark all as read
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[400px]">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b ${notification.read ? 'opacity-60' : ''}`}
                    onClick={() => handleMarkNotificationRead(notification.id)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{notification.title}</h3>
                      <Badge variant={notification.read ? "outline" : "default"}>
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                  </div>
                ))}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Support Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Subject"
                  value={supportForm.subject}
                  onChange={e => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                />
                <Textarea
                  placeholder="Message"
                  value={supportForm.message}
                  onChange={e => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                />
                <Button onClick={handleCreateSupport}>Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input
                name="full_name"
                value={profile?.full_name || ""}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                value={profile?.email || ""}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProfile} disabled={updating}>
                    {updating ? "Updating..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bank Accounts</CardTitle>
            <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
              <DialogTrigger asChild>
                <Button>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Bank Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Bank Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select
                    value={bankForm.bank_id}
                    onValueChange={value => setBankForm(prev => ({ ...prev, bank_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map(bank => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Account Number"
                    value={bankForm.account_number}
                    onChange={e => setBankForm(prev => ({ ...prev, account_number: e.target.value }))}
                  />
                  <Input
                    placeholder="Account Name"
                    value={bankForm.account_name}
                    onChange={e => setBankForm(prev => ({ ...prev, account_name: e.target.value }))}
                  />
                  <Button onClick={handleAddBankAccount}>Add Account</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.map(account => (
                <TableRow key={account.id}>
                  <TableCell>{account.bank?.name}</TableCell>
                  <TableCell>{account.account_name}</TableCell>
                  <TableCell>{account.account_number}</TableCell>
                  <TableCell>
                    {account.is_default && (
                      <Badge>Default</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!account.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefaultBank(account.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteBank(account.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivities.map(activity => (
                <TableRow key={activity.id}>
                  <TableCell className="capitalize">{activity.type}</TableCell>
                  <TableCell>${activity.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        activity.status === 'completed'
                          ? 'default'
                          : activity.status === 'failed'
                          ? 'destructive'
                          : 'outline'
                      }
                    >
                      {activity.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(activity.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
