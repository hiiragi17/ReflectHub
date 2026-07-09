'use client';

import LoggedInHeader from './LoggedInHeader';
import LoggedOutHeader from './LoggedOutHeader';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  isAuthenticated: boolean;
  userName?: string;
  onSignOut?: () => Promise<void>;
  title?: string;
  breadcrumbs?: Breadcrumb[];
  contactUrl?: string;
}

export default function Header({
  isAuthenticated,
  userName,
  onSignOut,
  title = 'ReflectHub',
  breadcrumbs,
  contactUrl
}: HeaderProps) {
  if (isAuthenticated && userName != null && onSignOut) {
    return (
      <LoggedInHeader
        userName={userName}
        onSignOut={onSignOut}
        title={title}
        breadcrumbs={breadcrumbs}
        contactUrl={contactUrl}
      />
    );
  }

  return <LoggedOutHeader title={title} contactUrl={contactUrl} />;
}
