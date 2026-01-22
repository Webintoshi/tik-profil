// Business Types
export interface Business {
    id: string;
    name: string;
    email: string;
    slug: string;
    previousSlugs?: string[];  // For 301 redirects when slug changes
    status: "active" | "pending" | "inactive" | "expired" | "frozen" | "deleted";
    package: "starter" | "pro" | "ultimate";
    modules: string[];
    createdAt: Date;
    owner: string;
    // Industry fields
    industry_id?: string;
    industry_label?: string;
    // Plan/Package fields
    plan_id?: string;
    // Profile fields
    logo?: string;
    cover?: string;
    slogan?: string;
    about?: string;
    // Subscription fields (MISSION 17)
    subscriptionStatus?: "active" | "expired" | "trial" | "free";
    subscriptionEndDate?: Date | null;
    subscriptionStartDate?: Date | null;
    packageId?: string | null;
    // Freeze functionality
    isFrozen?: boolean;
    frozenAt?: Date | null;
    frozenRemainingDays?: number | null;
}

// Package Types
export interface Package {
    id: "starter" | "pro" | "ultimate";
    name: string;
    description: string;
    price: number;
    features: string[];
    color: string;
}

// Module Types
export interface IndustryModule {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
}

// Wizard Types
export interface WizardStep {
    id: number;
    title: string;
    description: string;
}

export interface BusinessFormData {
    // Step 1: Identity
    name: string;
    email: string;
    slug: string;

    // Step 2: Package
    package: "starter" | "pro" | "ultimate";

    // Step 3: Capabilities
    modules: string[];
}
