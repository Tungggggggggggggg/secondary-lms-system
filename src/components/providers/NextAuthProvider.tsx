'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface NextAuthProviderProps {
  children: React.ReactNode;
}

export default function NextAuthProvider({ children }: NextAuthProviderProps) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}