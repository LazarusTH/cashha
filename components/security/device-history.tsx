"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface Device {
  id: string;
  browser: string;
  os: string;
  ip_address: string;
  last_active: number;
  is_current: boolean;
}

export function DeviceHistory() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("last_active", { ascending: false });

      if (error) throw error;

      setDevices(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from("devices")
        .delete()
        .eq("id", deviceId);

      if (error) throw error;

      setDevices(devices.filter((d) => d.id !== deviceId));
      toast({
        title: "Success",
        description: "Device removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between border-b pb-4 last:border-0"
            >
              <div>
                <div className="font-medium">
                  {device.browser} on {device.os}
                  {device.is_current && (
                    <span className="ml-2 text-sm text-green-500">(Current)</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last active {formatDistanceToNow(fromUnixTime(device.last_active))} ago
                </div>
                <div className="text-sm text-muted-foreground">
                  IP: {device.ip_address}
                </div>
              </div>
              {!device.is_current && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveDevice(device.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default DeviceHistory;
