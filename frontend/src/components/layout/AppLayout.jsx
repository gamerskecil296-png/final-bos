import React from 'react';
import { Outlet } from 'react-router-dom';
import PortalShell from './PortalShell';
import { PORTAL_CONFIG } from './PortalConfig';

export default function AppLayout() {
  const config = PORTAL_CONFIG.student;

  return (
    <PortalShell config={config}>
      <Outlet />
    </PortalShell>
  );
}