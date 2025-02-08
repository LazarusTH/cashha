"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import bcrypt from "bcryptjs";

interface SecurityQuestion {
  id: string;
  question: string;
  answer?: string;
}

interface SecurityQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingQuestions?: SecurityQuestion[];
}

const AVAILABLE_QUESTIONS = [
  "What was the name of your first pet?",
  "In which city were you born?",
  "What was your childhood nickname?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is the name of the street you grew up on?",
  "What is your favorite book?",
  "What is the name of your favorite childhood teacher?",
  "What is your favorite movie?",
  "What was your first car?",
];

export default function SecurityQuestionsDialog({
  open,
  onOpenChange,
  existingQuestions = [],
}: SecurityQuestionsDialogProps) {
  const [questions, setQuestions] = useState<SecurityQuestion[]>(
    existingQuestions.length
      ? existingQuestions
      : [{ id: "1", question: "", answer: "" }]
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const addQuestion = () => {
    if (questions.length < 3) {
      setQuestions([
        ...questions,
        { id: String(questions.length + 1), question: "", answer: "" },
      ]);
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: "question" | "answer", value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === id ? { ...q, [field]: value } : q
      )
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not found");

      // Validate questions
      const invalidQuestions = questions.filter(
        (q) => !q.question || !q.answer || q.answer.length < 3
      );

      if (invalidQuestions.length > 0) {
        throw new Error("Please fill in all questions and answers");
      }

      // Hash answers before storing
      const hashedQuestions = await Promise.all(
        questions.map(async (q) => ({
          profile_id: user.id,
          question: q.question,
          answer: await bcrypt.hash(q.answer!, 10),
        }))
      );

      // Delete existing questions
      await supabase
        .from("security_questions")
        .delete()
        .eq("profile_id", user.id);

      // Insert new questions
      const { error: insertError } = await supabase
        .from("security_questions")
        .insert(hashedQuestions);

      if (insertError) throw insertError;

      // Log the security event
      await supabase.from("security_logs").insert({
        profile_id: user.id,
        type: "SECURITY_QUESTIONS_UPDATED",
        ip_address: "client-ip", // You should get this from the client
      });

      toast({
        title: "Success",
        description: "Security questions have been updated",
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
          <DialogTitle>Security Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Set up security questions to help recover your account if you get locked
            out. Choose {3 - questions.length} more question
            {3 - questions.length === 1 ? "" : "s"}.
          </p>

          {questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Question {q.id}</Label>
                {questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(q.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Select
                value={q.question}
                onValueChange={(value) => updateQuestion(q.id, "question", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a security question" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_QUESTIONS.filter(
                    (question) =>
                      !questions.find((q) => q.question === question)
                  ).map((question) => (
                    <SelectItem key={question} value={question}>
                      {question}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Your answer"
                value={q.answer}
                onChange={(e) => updateQuestion(q.id, "answer", e.target.value)}
              />
            </div>
          ))}

          {questions.length < 3 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={addQuestion}
            >
              Add Another Question
            </Button>
          )}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={loading || questions.length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Security Questions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
