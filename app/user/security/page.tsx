"use client";

import { Suspense } from "react";
import SecurityContent from "./security-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function SecurityPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <SecurityContent />
      </Suspense>
    </div>
  );
}
