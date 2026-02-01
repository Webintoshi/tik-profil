'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const VEHICLE_RENTAL_MODULES = ['vehicle-rental', 'rentacar', 'arac-kiralama', 'oto-kiralama', 'rent-a-car'];

interface VehicleRentalGuardProps {
  children: React.ReactNode;
}

export function VehicleRentalGuard({ children }: VehicleRentalGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkModuleAccess = async () => {
      try {
        const res = await fetch('/api/panel/profile');
        const data = await res.json();
        
        if (data.success && data.profile) {
          const modules = data.profile.modules || [];
          const hasAccess = modules.some((m: string) => 
            VEHICLE_RENTAL_MODULES.includes(m.toLowerCase())
          );
          
          if (!hasAccess) {
            router.push('/panel');
            return;
          }
          setIsAuthorized(true);
        } else {
          router.push('/panel');
        }
      } catch (error) {
        console.error('Module check error:', error);
        router.push('/panel');
      } finally {
        setIsChecking(false);
      }
    };
    
    checkModuleAccess();
  }, [router]);

  if (isChecking || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
