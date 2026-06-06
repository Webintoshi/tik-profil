'use client';

import { PanelModuleNotice } from '@/components/panel/PanelModuleNotice';
import { useBusinessSession } from '@/hooks/useBusinessSession';
import { getPanelModuleAccess } from '@/lib/panel/moduleEntitlements';

interface VehicleRentalGuardProps {
  children: React.ReactNode;
}

export function VehicleRentalGuard({ children }: VehicleRentalGuardProps) {
  const { session, isLoading } = useBusinessSession();

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const access = getPanelModuleAccess('vehicle-rental', {
    enabledModules: session.enabledModules,
  });

  if (access.kind !== 'allowed') {
    return (
      <PanelModuleNotice
        title={access.title}
        description={access.description}
        primaryHref={access.primaryHref}
        primaryLabel={access.primaryLabel}
      />
    );
  }

  return <>{children}</>;
}
