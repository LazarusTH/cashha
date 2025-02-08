"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface AccountRecoveryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountRecovery({
  open,
  onOpenChange,
}: AccountRecoveryProps) {
  const [step, setStep] = useState<"email" | "questions">("email");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const handleEmailSubmit = async () => {
    try {
      setLoading(true);
      
      // Get security questions for the email
      const { data: profile } = await supabase
        .from("profiles")
        .select("security_questions(question)")
        .eq("email", email)
        .single();

      if (!profile?.security_questions?.length) {
        throw new Error("No security questions found for this email");
      }

      setQuestions(profile.security_questions.map((q: any) => q.question));
      setAnswers(new Array(profile.security_questions.length).fill(""));
      setStep("questions");
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

  const handleRecovery = async () => {
    try {
      setLoading(true);

      // Validate answers
      if (answers.some((a) => !a)) {
        throw new Error("Please answer all security questions");
      }

      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answers }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast({
        title: "Success",
        description: "Recovery email has been sent to your inbox",
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

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account Recovery</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === "email" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Enter your email address to start the account recovery process.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleEmailSubmit}
                disabled={loading || !email}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Please answer your security questions to recover your account.
              </p>
              {questions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <Label>{question}</Label>
                  <Input
                    value={answers[index]}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    placeholder="Your answer"
                    type="password"
                  />
                </div>
              ))}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("email")}
                >
                  Back
                </Button>
                <Button
                  className="w-full"
                  onClick={handleRecovery}
                  disabled={loading || answers.some((a) => !a)}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Recover Account
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
