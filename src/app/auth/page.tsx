import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto border-0 shadow-sm bg-white rounded-lg p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-6"></div>
        <div className="h-11 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}