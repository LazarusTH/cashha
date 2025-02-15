"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface LoginHistoryProps {
  loginAttempts: Array<{
    id: string;
    ip_address: string;
    location?: string;
    created_at: string;
    success: boolean;
  }>;
}

export function LoginHistory({ loginAttempts }: LoginHistoryProps) {
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4">
        {loginAttempts.map((attempt) => (
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
            <Badge variant={attempt.success ? "default" : "destructive"}>
              {attempt.success ? "Success" : "Failed"}
            </Badge>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
} 