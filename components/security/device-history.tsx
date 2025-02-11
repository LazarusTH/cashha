"use client";

import { useState, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Monitor, Smartphone, Laptop } from "lucide-react";
import { formatDistanceToNow, fromUnixTime } from "date-fns";

interface Device {
  id: string;
  device_name: string;
  device_id: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

interface DeviceHistoryProps {
  devices: Device[];
}

export default function DeviceHistory({ devices }: DeviceHistoryProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const getDeviceIcon = (device: Device) => {
    const os = device.os.toLowerCase();
    if (os.includes("android") || os.includes("ios")) {
      return <Smartphone className="h-4 w-4" />;
    } else if (os.includes("windows") || os.includes("mac") || os.includes("linux")) {
      return <Laptop className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getLastActive = (lastActive: string | null) => {
    console.log(lastActive);
    if (!lastActive) return "Never";
    
    // Convert to number and check if it's a Unix timestamp
    const timestamp = Number(lastActive);
    if (!isNaN(timestamp)) {
      try {
        const date = fromUnixTime(timestamp);
        return formatDistanceToNow(date, { addSuffix: true });
      } catch {
        return "Unknown";
      }
    }
    return "Unknown";
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      setLoading(deviceId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("device_history")
        .delete()
        .match({ id: deviceId, profile_id: user.id });

      if (error) throw error;

      // Log the security event
      await supabase.from("security_logs").insert({
        profile_id: user.id,
        type: "DEVICE_REMOVED",
        ip_address: "client-ip", // You should get this from the client
        details: { device_id: deviceId },
      });

      toast({
        title: "Success",
        description: "Device has been removed from your account",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Device History</h3>
        <p className="text-sm text-muted-foreground">
          These are the devices that have been used to access your account
        </p>
      </div>

      <div className="space-y-4">
        {devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center space-x-4">
              {getDeviceIcon(device)}
              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium">
                    {device.device_name || "Unknown Device"}
                  </p>
                  {device.is_current && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Current Device
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {device.browser} on {device.os}
                </p>
                <p className="text-sm text-muted-foreground">
                  {device.ip_address}
                  {device.location && ` · ${device.location}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last active{" "}
                  {getLastActive(device.last_active)}
                </p>
              </div>
            </div>
            {!device.is_current && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveDevice(device.id)}
                disabled={loading === device.id}
              >
                {loading === device.id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Remove
              </Button>
            )}
          </div>
        ))}

        {devices.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No devices found
          </p>
        )}
      </div>
    </div>
  );
}
