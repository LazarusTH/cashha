"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface SecurityLogsProps {
  logs: Array<{
    id: string;
    type: string;
    ip_address: string;
    created_at: string;
  }>;
}

export function SecurityLogs({ logs }: SecurityLogsProps) {
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4">
        {logs.map((log) => (
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
    </ScrollArea>
  );
} 