import { lazy, ComponentType } from "react";

// Module metadata type
export interface ModuleDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    component: ComponentType;
}

// Lazy-loaded industry components
const HotelsModule = lazy(() => import("@/app/(dashboard)/business/hotels/page"));
const RestaurantsModule = lazy(() => import("@/app/(dashboard)/business/restaurants/page"));
const FastFoodModule = lazy(() => import("@/app/(dashboard)/business/fastfood/page"));
const PetShopsModule = lazy(() => import("@/app/(dashboard)/business/petshops/page"));
const RealEstateModule = lazy(() => import("@/app/(dashboard)/business/realestate/page"));
const GymsModule = lazy(() => import("@/app/(dashboard)/business/gyms/page"));
const SalonsModule = lazy(() => import("@/app/(dashboard)/business/salons/page"));
const ClinicsModule = lazy(() => import("@/app/(dashboard)/business/clinics/page"));

// Global Module Registry
export const moduleRegistry: Record<string, ModuleDefinition> = {
    hotels: {
        id: "hotels",
        name: "Hotels",
        description: "Booking & room management system",
        icon: "Building",
        category: "Hospitality",
        component: HotelsModule,
    },
    restaurants: {
        id: "restaurants",
        name: "Restaurants",
        description: "Table reservations & menu management",
        icon: "UtensilsCrossed",
        category: "Food & Beverage",
        component: RestaurantsModule,
    },
    fastfood: {
        id: "fastfood",
        name: "Fast Food",
        description: "Quick service & order management",
        icon: "Pizza",
        category: "Food & Beverage",
        component: FastFoodModule,
    },
    petshops: {
        id: "petshops",
        name: "Pet Shops",
        description: "Pet inventory & service tracking",
        icon: "Cat",
        category: "Retail",
        component: PetShopsModule,
    },
    realestate: {
        id: "realestate",
        name: "Real Estate",
        description: "Property listings & client management",
        icon: "Home",
        category: "Real Estate",
        component: RealEstateModule,
    },
    gyms: {
        id: "gyms",
        name: "Gyms",
        description: "Membership & class scheduling",
        icon: "Dumbbell",
        category: "Health & Fitness",
        component: GymsModule,
    },
    salons: {
        id: "salons",
        name: "Salons",
        description: "Appointment booking & staff management",
        icon: "Scissors",
        category: "Beauty",
        component: SalonsModule,
    },
    clinics: {
        id: "clinics",
        name: "Clinics",
        description: "Patient records & appointment system",
        icon: "Stethoscope",
        category: "Healthcare",
        component: ClinicsModule,
    },
};

// Helper functions
export function getModule(id: string): ModuleDefinition | undefined {
    return moduleRegistry[id];
}

export function getModulesByCategory(category: string): ModuleDefinition[] {
    return Object.values(moduleRegistry).filter((m) => m.category === category);
}

export function getAllModules(): ModuleDefinition[] {
    return Object.values(moduleRegistry);
}

export function getCategories(): string[] {
    return [...new Set(Object.values(moduleRegistry).map((m) => m.category))];
}

// Module injection for admin
export function injectModule(businessId: string, moduleId: string): boolean {
    const module = getModule(moduleId);
    if (!module) {
        console.error(`Module ${moduleId} not found in registry`);
        return false;
    }
    // In real implementation, this would update database
    return true;
}
