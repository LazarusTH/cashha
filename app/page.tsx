"use client"
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import Link from "next/link";

const Home = () => {
  return (
    <main className={cn("flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100")}>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Our Platform</h1>
        <p className="text-lg text-gray-600 mb-8">
          Welcome To cashora. Sign in or create an account to get started.
        </p>
        <div className="space-x-4">          
          <Link href="/signin">
            <Button size="lg">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="secondary">Create Account</Button>
          </Link>
        </div>        
      </div>
    </main>
  );
};

export default Home;
