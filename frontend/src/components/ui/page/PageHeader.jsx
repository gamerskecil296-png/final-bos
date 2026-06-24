import React from 'react';
import { DashboardHero } from '@/components/ui/dashboard';

export function PageHeader({ 
  title, 
  subtitle, 
  icon = 'dashboard', 
  breadcrumbs = [], 
  action,
  className,
  ...props 
}) {
  return (
    <DashboardHero 
      title={title}
      subtitle={subtitle}
      icon={icon}
      breadcrumbs={breadcrumbs}
      actions={action}
      className={className}
      {...props}
    />
  );
}

