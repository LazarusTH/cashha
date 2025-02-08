"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TwoFactorDialog from "./two-factor-dialog";
import SecurityQuestionsDialog from "./security-questions-dialog";
import DeviceHistory from "./device-history";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface SecurityDashboardProps {
  profile: any;
  loginAttempts: any[];
  securityLogs: any[];
}

export default function SecurityDashboard({
  profile,
  loginAttempts,
  securityLogs,
}: SecurityDashboardProps) {
  const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false);
  const [showSecurityQuestionsDialog, setShowSecurityQuestionsDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Security Settings</h2>
        <p className="text-muted-foreground">
          Manage your account security and protection settings
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Add an extra layer of security to your account
                </p>
                <Badge variant={profile?.two_factor_enabled ? "success" : "secondary"}>
                  {profile?.two_factor_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <Button onClick={() => setShowTwoFactorDialog(true)}>
                {profile?.two_factor_enabled ? "Manage 2FA" : "Enable 2FA"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Questions</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Set up security questions for account recovery
                </p>
                <Badge
                  variant={profile?.security_questions?.length ? "success" : "secondary"}
                >
                  {profile?.security_questions?.length
                    ? `${profile.security_questions.length} Questions Set`
                    : "Not Set"}
                </Badge>
              </div>
              <Button onClick={() => setShowSecurityQuestionsDialog(true)}>
                Manage Questions
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified about important security events
                  </p>
                </div>
                <Badge variant={profile?.email_notifications ? "success" : "secondary"}>
                  {profile?.email_notifications ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Login Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new device logins
                  </p>
                </div>
                <Badge variant={profile?.login_alerts ? "success" : "secondary"}>
                  {profile?.login_alerts ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card className="p-6">
            <DeviceHistory devices={profile?.device_history || []} />
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Login Attempts</h3>
            <div className="space-y-4">
              {loginAttempts?.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {attempt.ip_address}
                      {attempt.location && ` from ${attempt.location}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(attempt.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Badge variant={attempt.success ? "success" : "destructive"}>
                    {attempt.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Events</h3>
            <div className="space-y-4">
              {securityLogs?.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{log.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {log.ip_address}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <TwoFactorDialog
        open={showTwoFactorDialog}
        onOpenChange={setShowTwoFactorDialog}
        enabled={profile?.two_factor_enabled}
      />

      <SecurityQuestionsDialog
        open={showSecurityQuestionsDialog}
        onOpenChange={setShowSecurityQuestionsDialog}
        existingQuestions={profile?.security_questions}
      />
    </div>
  );
}
