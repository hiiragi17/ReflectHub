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
  contactUrl?: string;
}

export default function Header({
  isAuthenticated,
  userName,
  onSignOut,
  title = 'ReflectHub',
  showBackButton = false,
  backHref = '/dashboard',
  contactUrl
}: HeaderProps) {
  if (isAuthenticated && userName != null && onSignOut) {
    return (
      <LoggedInHeader
        userName={userName}
        onSignOut={onSignOut}
        title={title}
        showBackButton={showBackButton}
        backHref={backHref}
        contactUrl={contactUrl}
      />
    );
  }

  return <LoggedOutHeader title={title} contactUrl={contactUrl} />;
}