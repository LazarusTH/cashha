"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecuritySettings } from "./security-settings";
import { LoginHistory } from "./login-history";
import { SecurityLogs } from "./security-logs";

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
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Security Settings</h1>
      
      <SecuritySettings profile={profile} />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Login Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginHistory loginAttempts={loginAttempts} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Security Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <SecurityLogs logs={securityLogs} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
