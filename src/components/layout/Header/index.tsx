'use client';

import LoggedInHeader from './LoggedInHeader';
import LoggedOutHeader from './LoggedOutHeader';

interface HeaderProps {
  isAuthenticated: boolean;
  userName?: string;
  onSignOut?: () => Promise<void>;
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export default function Header({ 
  isAuthenticated, 
  userName,
  onSignOut,
  title = 'ReflectHub',
  showBackButton = false,
  backHref = '/dashboard'
}: HeaderProps) {
  if (isAuthenticated && userName != null && onSignOut) {
    return (
      <LoggedInHeader 
        userName={userName} 
        onSignOut={onSignOut}
        title={title}
        showBackButton={showBackButton}
        backHref={backHref}
      />
    );
  }

  return <LoggedOutHeader title={title} />;
}