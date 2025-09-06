import LoginForm from '@/components/auth/LoginForm';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="w-full max-width-md">
        <LoginForm />
      </div>
    </div>
  );
}