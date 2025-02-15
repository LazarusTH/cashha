"use client"
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

const Home = () => {
  return (
    <main className={cn('flex min-h-screen flex-col items-center justify-between p-24')}>
      <Link href="/dashboard">
        <Button variant="outline" className="hover:bg-accent hover:text-accent-foreground">
          Dashboard <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </main>
  );
};

export default Home;
