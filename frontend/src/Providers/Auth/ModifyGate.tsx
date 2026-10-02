import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './Auth.provider';

export function ModifyGate() {
  const { user } = useAuth();

  if (!user?.canModify) {
    return <Navigate to="/root" replace />;
  }

  return <Outlet />;
}
