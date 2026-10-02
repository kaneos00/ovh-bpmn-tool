import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './Auth.provider';

export function AdminGate() {
  const { user } = useAuth();

  if (!user?.canAdministerUsers) {
    return <Navigate to="/root" replace />;
  }

  return <Outlet />;
}
