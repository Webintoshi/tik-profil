"use client";

import { useState, useEffect } from "react";
import { Utensils, Phone, Scissors, Stethoscope, Calendar, BedDouble, ChevronDown, Home, BookOpen, ShoppingBag, Car } from "lucide-react";
import { ReservationModal } from "./ReservationModal";
import { EmlakListingsSheet } from "./EmlakListingsSheet";
import BeautyServicesSheet from "./BeautyServicesSheet";
import ClinicServicesSheet from "./ClinicServicesSheet";
import EcommerceSheet from "./EcommerceSheet";
import { HotelInlineMenu } from "./HotelInlineMenu";
import { VehicleRentalInlineMenu } from "./VehicleRentalInlineMenu";
import { prefetchMenuData } from "@/lib/menuCache";
import { prefetchBeautyData } from "@/lib/beautyCache";
import Link from "next/link";
import clsx from "clsx";

interface ActionButtonProps {
    industry: string;
    whatsappNumber?: string;
    businessName: string;
    businessSlug?: string;
    businessId?: string;
    businessLogo?: string;
    businessPhone?: string;
}

// Industry action configurations
const INDUSTRY_ACTIONS: Record<string, { label: string; icon: string; type: "reservation" | "call" | "link" | "inline-menu" | "emlak-menu" | "beauty-menu" | "fastfood-menu" | "restaurant-menu" | "ecommerce-menu" | "hotel-menu" | "vehicle-rental" | "clinic-menu"; linkPath?: string }> = {
    "e-commerce": { label: "Sipariş Ver", icon: "cart", type: "ecommerce-menu" },
    "ecommerce": { label: "Sipariş Ver", icon: "cart", type: "ecommerce-menu" },
    "online-magaza": { label: "Sipariş Ver", icon: "cart", type: "ecommerce-menu" },
    "restaurant": { label: "Menü", icon: "book", type: "restaurant-menu" },
    "restorant": { label: "Menü", icon: "book", type: "restaurant-menu" },
    "restoran": { label: "Menü", icon: "book", type: "restaurant-menu" },
    "cafe": { label: "Menü", icon: "book", type: "restaurant-menu" },
    "kafe": { label: "Menü", icon: "book", type: "restaurant-menu" },
    "fastfood": { label: "Sipariş Ver", icon: "utensils", type: "fastfood-menu" },
    "fast-food": { label: "Sipariş Ver", icon: "utensils", type: "fastfood-menu" },
    // Hotel types - inline menu for room types
    "hotel": { label: "Odaları Gör", icon: "bed", type: "hotel-menu" },
    "otel": { label: "Odaları Gör", icon: "bed", type: "hotel-menu" },
    "hostel": { label: "Odaları Gör", icon: "bed", type: "hotel-menu" },
    "boutique": { label: "Odaları Gör", icon: "bed", type: "hotel-menu" },
    "aparthotel": { label: "Odaları Gör", icon: "bed", type: "hotel-menu" },
    // Emlak types - inline menu for listings
    "emlak": { label: "İlanlar", icon: "home", type: "emlak-menu" },
    "realestate": { label: "İlanlar", icon: "home", type: "emlak-menu" },
    "real-estate": { label: "İlanlar", icon: "home", type: "emlak-menu" },
    "gayrimenkul": { label: "İlanlar", icon: "home", type: "emlak-menu" },
    // Beauty types - inline menu for services
    "beauty": { label: "Hizmetler", icon: "scissors", type: "beauty-menu" },
    "salon": { label: "Hizmetler", icon: "scissors", type: "beauty-menu" },
    "guzellik": { label: "Hizmetler", icon: "scissors", type: "beauty-menu" },
    "kuafor": { label: "Hizmetler", icon: "scissors", type: "beauty-menu" },
    "spa": { label: "Hizmetler", icon: "scissors", type: "beauty-menu" },
    "barber": { label: "Hizmetler", icon: "scissors", type: "beauty-menu" },
    // Health & Clinic types - inline menu for services
    "health": { label: "Hizmetler", icon: "calendar", type: "clinic-menu" },
    "clinic": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "hospital": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "dentist": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "veteriner": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "pharmacy": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "optik": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "physiotherapy": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "psychology": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "nutrition": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    "laboratory": { label: "Hizmetler", icon: "stethoscope", type: "clinic-menu" },
    // Vehicle Rental types
    "vehicle-rental": { label: "Araç Kirala", icon: "car", type: "vehicle-rental" },
    "arac-kiralama": { label: "Araç Kirala", icon: "car", type: "vehicle-rental" },
    "rentacar": { label: "Araç Kirala", icon: "car", type: "vehicle-rental" },
    "oto-kiralama": { label: "Araç Kirala", icon: "car", type: "vehicle-rental" },
    "rent-a-car": { label: "Araç Kirala", icon: "car", type: "vehicle-rental" },
    // Normalized label formats (from [slug]/page.tsx)
    "arackiralama": { label: "Araç Kirala", icon: "car", type: "vehicle-rental" },
    "otokiralama": { label: "Araç Kirala", icon: "car", type: "vehicle-rental" },
    "default": { label: "İletişime Geç", icon: "phone", type: "call" },
};

export function ActionButton({ industry, whatsappNumber, businessName, businessSlug, businessId, businessLogo, businessPhone }: ActionButtonProps) {
    const [showReservationModal, setShowReservationModal] = useState(false);
    const [showEmlakSheet, setShowEmlakSheet] = useState(false);
    const [showBeautySheet, setShowBeautySheet] = useState(false);
    const [showClinicSheet, setShowClinicSheet] = useState(false);
    const [showFastFoodMenu, setShowFastFoodMenu] = useState(false);
    const [showRestaurantMenu, setShowRestaurantMenu] = useState(false);
    const [showEcommerceSheet, setShowEcommerceSheet] = useState(false);
    const [showHotelMenu, setShowHotelMenu] = useState(false);
    const [showVehicleRental, setShowVehicleRental] = useState(false);
    const [menuDataLoaded, setMenuDataLoaded] = useState(false);
    const [beautyDataLoaded, setBeautyDataLoaded] = useState(false);

    // Normalize industry to lowercase for consistent matching
    const normalizedIndustry = industry?.toLowerCase().trim() || "default";
    const action = INDUSTRY_ACTIONS[normalizedIndustry] || INDUSTRY_ACTIONS["default"];

    // PREFETCH: Load menu data immediately when page loads for fastfood
    useEffect(() => {
        if (action.type === "fastfood-menu" && businessSlug && !menuDataLoaded) {
            // Prefetch menu data to global cache
            prefetchMenuData(businessSlug)
                .then(() => setMenuDataLoaded(true))
                .catch(() => { }); // Ignore errors, will retry when menu opened
        }
    }, [action.type, businessSlug, menuDataLoaded]);

    // PREFETCH: Load beauty data immediately when page loads for beauty
    useEffect(() => {
        if (action.type === "beauty-menu" && businessSlug && !beautyDataLoaded) {
            // Prefetch beauty data to global cache
            prefetchBeautyData(businessSlug)
                .then(() => setBeautyDataLoaded(true))
                .catch(() => { }); // Ignore errors, will retry when menu opened
        }
    }, [action.type, businessSlug, beautyDataLoaded]);

    const renderIcon = () => {
        switch (action.icon) {
            case "cart":
                return (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                );
            case "calendar":
                return <Calendar className="w-6 h-6" />;
            case "utensils":
                return <Utensils className="w-6 h-6" />;
            case "scissors":
                return <Scissors className="w-6 h-6" />;
            case "stethoscope":
                return <Stethoscope className="w-6 h-6" />;
            case "bed":
                return <BedDouble className="w-6 h-6" />;
            case "home":
                return <Home className="w-6 h-6" />;
            case "book":
                return <BookOpen className="w-6 h-6" />;
            case "car":
                return <Car className="w-6 h-6" />;
            case "phone":
            default:
                return <Phone className="w-6 h-6" />;
        }
    };

    const handleClick = () => {
        if (action.type === "reservation") {
            setShowReservationModal(true);

        } else if (action.type === "emlak-menu") {
            setShowEmlakSheet(!showEmlakSheet);
        } else if (action.type === "beauty-menu") {
            setShowBeautySheet(!showBeautySheet);
        } else if (action.type === "clinic-menu") {
            setShowClinicSheet(!showClinicSheet);
        } else if (action.type === "fastfood-menu") {
            setShowFastFoodMenu(!showFastFoodMenu);
        } else if (action.type === "restaurant-menu") {
            setShowRestaurantMenu(!showRestaurantMenu);
        } else if (action.type === "ecommerce-menu") {
            setShowEcommerceSheet(!showEcommerceSheet);
        } else if (action.type === "hotel-menu") {
            setShowHotelMenu(!showHotelMenu);
        } else if (action.type === "vehicle-rental") {
            setShowVehicleRental(!showVehicleRental);
        } else if (action.type === "call" && whatsappNumber) {
            const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, "");
            window.open(`tel:${cleanNumber}`, "_self");
        }
    };

    // If action has a linkPath, render as Link
    if (action.type === "link" && action.linkPath && businessSlug) {
        return (
            <Link
                href={`/${businessSlug}${action.linkPath}`}
                className="
                    h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                    bg-purple-600 shadow-[0_10px_20px_-5px_rgba(147,51,234,0.4)]
                    transition-transform active:scale-95 hover:bg-purple-700
                "
            >
                {renderIcon()}
                {action.label}
            </Link>
        );
    }

    // For emlak-menu type, render button + EmlakListingsSheet (same pattern as inline-menu)
    if (action.type === "emlak-menu") {
        return (
            <>
                {/* Button - same styling as others */}
                <button
                    onClick={handleClick}
                    className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-purple-600 shadow-lg shadow-purple-500/25
                        transition-transform active:scale-95 hover:bg-purple-700
                    "
                >
                    {renderIcon()}
                    {action.label}
                    <ChevronDown className={clsx(
                        "w-4 h-4 transition-transform",
                        showEmlakSheet && "rotate-180"
                    )} />
                </button>

                {/* Emlak Listings Sheet - ALWAYS mounted for preloading */}
                {businessSlug && (
                    <EmlakListingsSheet
                        isOpen={showEmlakSheet}
                        businessSlug={businessSlug}
                        businessName={businessName}
                        whatsappNumber={whatsappNumber}
                        onClose={() => setShowEmlakSheet(false)}
                    />
                )}
            </>
        );
    }

    // For beauty-menu type, render button + BeautyServicesSheet
    if (action.type === "beauty-menu") {
        return (
            <>
                {/* Button */}
                <button
                    onClick={handleClick}
                    className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-purple-600 shadow-lg shadow-purple-500/25
                        transition-transform active:scale-95 hover:bg-purple-700
                    "
                >
                    {renderIcon()}
                    {action.label}
                    <ChevronDown className={clsx(
                        "w-4 h-4 transition-transform",
                        showBeautySheet && "rotate-180"
                    )} />
                </button>

                {/* Beauty Services Sheet */}
                {businessSlug && (
                    <BeautyServicesSheet
                        isOpen={showBeautySheet}
                        businessSlug={businessSlug}
                        onClose={() => setShowBeautySheet(false)}
                    />
                )}
            </>
        );
    }

    // For clinic-menu type, render button + ClinicServicesSheet
    if (action.type === "clinic-menu") {
        return (
            <>
                {/* Button */}
                <button
                    onClick={handleClick}
                    className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-purple-600 shadow-lg shadow-purple-500/25
                        transition-transform active:scale-95 hover:bg-purple-700
                    "
                >
                    {renderIcon()}
                    {action.label}
                    <ChevronDown className={clsx(
                        "w-4 h-4 transition-transform",
                        showClinicSheet && "rotate-180"
                    )} />
                </button>

                {/* Clinic Services Sheet */}
                {businessSlug && (
                    <ClinicServicesSheet
                        isOpen={showClinicSheet}
                        businessSlug={businessSlug}
                        onClose={() => setShowClinicSheet(false)}
                    />
                )}
            </>
        );
    }

    // For ecommerce-menu type, render button + EcommerceSheet
    if (action.type === "ecommerce-menu") {
        return (
            <>
                {/* Button */}
                <button
                    onClick={handleClick}
                    className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-purple-600 shadow-lg shadow-purple-500/25
                        transition-transform active:scale-95 hover:bg-purple-700
                    "
                >
                    {renderIcon()}
                    {action.label}
                    <ChevronDown className={clsx(
                        "w-4 h-4 transition-transform",
                        showEcommerceSheet && "rotate-180"
                    )} />
                </button>

                {/* Ecommerce Sheet */}
                {businessId && (
                    <EcommerceSheet
                        isOpen={showEcommerceSheet}
                        businessId={businessId}
                        businessName={businessName}
                        onClose={() => setShowEcommerceSheet(false)}
                    />
                )}
            </>
        );
    }


    // For hotel-menu type, render button + inline menu
    if (action.type === "hotel-menu") {
        return (
            <>
                {/* Button - same styling as others */}
                <button
                    onClick={handleClick}
                    className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-purple-600 shadow-lg shadow-purple-500/25
                        transition-transform active:scale-95 hover:bg-purple-700
                    "
                >
                    {renderIcon()}
                    {action.label}
                    <ChevronDown className={clsx(
                        "w-4 h-4 transition-transform",
                        showHotelMenu && "rotate-180"
                    )} />
                </button>

                {/* Hotel Inline Menu */}
                {businessSlug && (
                    <HotelInlineMenu
                        isOpen={showHotelMenu}
                        businessSlug={businessSlug}
                        onClose={() => setShowHotelMenu(false)}
                    />
                )}
            </>
        );
    }

    // For vehicle-rental type, render button + VehicleRentalInlineMenu
    if (action.type === "vehicle-rental") {
        return (
            <>
                {/* Button */}
                <button
                    onClick={handleClick}
                    className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-purple-600 shadow-lg shadow-purple-500/25
                        transition-transform active:scale-95 hover:bg-purple-700
                    "
                >
                    {renderIcon()}
                    {action.label}
                    <ChevronDown className={clsx(
                        "w-4 h-4 transition-transform",
                        showVehicleRental && "rotate-180"
                    )} />
                </button>

                {/* Vehicle Rental Inline Menu */}
                {businessSlug && showVehicleRental && (
                    <VehicleRentalInlineMenu
                        isOpen={showVehicleRental}
                        businessSlug={businessSlug}
                        businessName={businessName}
                        whatsappNumber={whatsappNumber}
                        onClose={() => setShowVehicleRental(false)}
                    />
                )}
            </>
        );
    }

    // For fastfood-menu type, render button + inline menu (ALWAYS mounted for prefetch)
    if (action.type === "fastfood-menu") {
        // Import dynamically to avoid issues
        const FastFoodInlineMenu = require("./FastFoodInlineMenu").FastFoodInlineMenu;

        return (
            <>
                {/* Button - same styling as others */}
                <button
                    onClick={handleClick}
                    className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-purple-600 shadow-lg shadow-purple-500/25
                        transition-transform active:scale-95 hover:bg-purple-700
                    "
                >
                    {renderIcon()}
                    {action.label}
                    <ChevronDown className={clsx(
                        "w-4 h-4 transition-transform",
                        showFastFoodMenu && "rotate-180"
                    )} />
                </button>

                {/* FastFood Inline Menu - ALWAYS mounted for prefetching, visibility controlled by isOpen */}
                {businessSlug && (
                    <FastFoodInlineMenu
                        isOpen={showFastFoodMenu}
                        businessSlug={businessSlug}
                        businessName={businessName}
                        businessId={businessId}
                        businessLogo={businessLogo}
                        businessPhone={businessPhone}
                        onClose={() => setShowFastFoodMenu(false)}
                        prefetch={true}
                    />
                )}
            </>
        );
    }

    // For restaurant-menu type, render button + RestaurantInlineMenu
    if (action.type === "restaurant-menu") {
        const RestaurantInlineMenu = require("./RestaurantInlineMenu").RestaurantInlineMenu;

        return (
            <>
                {/* Button */}
                <button
                    onClick={handleClick}
                    className="
                        h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                        bg-purple-600 shadow-lg shadow-purple-500/25
                        transition-transform active:scale-95 hover:bg-purple-700
                    "
                >
                    {renderIcon()}
                    {action.label}
                    <ChevronDown className={clsx(
                        "w-4 h-4 transition-transform",
                        showRestaurantMenu && "rotate-180"
                    )} />
                </button>

                {/* Restaurant Inline Menu */}
                {businessSlug && (
                    <RestaurantInlineMenu
                        isOpen={showRestaurantMenu}
                        businessSlug={businessSlug}
                        businessName={businessName}
                        businessId={businessId}
                        whatsappNumber={whatsappNumber}
                        onClose={() => setShowRestaurantMenu(false)}
                    />
                )}
            </>
        );
    }
    return (
        <>
            <button
                onClick={handleClick}
                className="
                    h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm md:text-base
                    bg-purple-600 shadow-[0_10px_20px_-5px_rgba(147,51,234,0.4)]
                    transition-transform active:scale-95 hover:bg-purple-700
                "
            >
                {renderIcon()}
                {action.label}
            </button>

            {/* Reservation Modal */}
            <ReservationModal
                isOpen={showReservationModal}
                onClose={() => setShowReservationModal(false)}
                businessName={businessName}
                whatsappNumber={whatsappNumber}
            />
        </>
    );
}

