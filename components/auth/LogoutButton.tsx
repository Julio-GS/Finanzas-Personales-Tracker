'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

export function LogoutButton({
  variant = 'outline',
  className,
}: LogoutButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Even if the network call fails, attempt to redirect to /login
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
      type="button"
    >
      {isLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </Button>
  );
}
