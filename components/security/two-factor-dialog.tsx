"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface TwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabled: boolean;
}

export default function TwoFactorDialog({
  open,
  onOpenChange,
  enabled,
}: TwoFactorDialogProps) {
  const [step, setStep] = useState<"verify" | "setup" | "disable">("verify");
  const [loading, setLoading] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const handleSetup = async () => {
    try {
      setLoading(true);
      const newSecret = authenticator.generateSecret();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not found");

      const otpauth = authenticator.keyuri(
        user.email || "",
        "Your App Name",
        newSecret
      );

      const qrCode = await QRCode.toDataURL(otpauth);
      setQrCodeUrl(qrCode);
      setSecret(newSecret);
      setStep("setup");
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

  const handleVerify = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not found");

      const isValid = authenticator.verify({
        token: verifyCode,
        secret: secret,
      });

      if (!isValid) {
        throw new Error("Invalid verification code");
      }

      // Update profile with 2FA secret
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          two_factor_enabled: true,
          two_factor_secret: secret,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Log the security event
      await supabase.from("security_logs").insert({
        profile_id: user.id,
        type: "2FA_ENABLED",
        ip_address: "client-ip", // You should get this from the client
        details: { method: "TOTP" },
      });

      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled",
      });

      onOpenChange(false);
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

  const handleDisable = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not found");

      // Update profile to disable 2FA
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Log the security event
      await supabase.from("security_logs").insert({
        profile_id: user.id,
        type: "2FA_DISABLED",
        ip_address: "client-ip", // You should get this from the client
      });

      toast({
        title: "Success",
        description: "Two-factor authentication has been disabled",
      });

      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
        </DialogHeader>

        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Two-factor authentication is currently enabled. What would you like to do?"
                : "Add an extra layer of security to your account by enabling two-factor authentication."}
            </p>
            {enabled ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setStep("disable")}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleSetup}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set Up 2FA
              </Button>
            )}
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code with your authenticator app
            </p>
            <div className="space-y-2">
              <Label htmlFor="verify">Verification Code</Label>
              <Input
                id="verify"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="Enter 6-digit code"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={loading || verifyCode.length !== 6}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify and Enable
            </Button>
          </div>
        )}

        {step === "disable" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to disable two-factor authentication? This will
              make your account less secure.
            </p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep("verify")}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDisable}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable 2FA
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
