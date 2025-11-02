'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

interface LoggedOutHeaderProps {
  title?: string;
}

export default function LoggedOutHeader({ 
  title = 'ReflectHub' 
}: LoggedOutHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">
              自分の成長を記録しましょう
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <LogIn className="w-4 h-4 mr-2" />
                ログイン
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}