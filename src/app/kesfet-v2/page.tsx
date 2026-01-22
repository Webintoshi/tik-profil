"use client";

import { useState } from "react";
import ExploreHeader from "@/components/explore/ExploreHeader";
import CategoryTabs from "@/components/explore/CategoryTabs";
import DiscoveryFeed from "@/components/explore/DiscoveryFeed";
import FilterModal from "@/components/explore/FilterModal";
import { useTheme } from "@/components/explore/ThemeProvider";
import { useLocation } from "@/components/explore/LocationProvider";

type ViewMode = "feed" | "grid";

export default function ExplorePage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [viewMode, setViewMode] = useState<ViewMode>("feed");
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { lat, lng, city, district } = useLocation();

    const locationText = city ? `${district || city}${city !== district ? `, ${city}` : ""}` : "Konum";

    return (
        <div className={`min-h-screen pb-20 transition-colors duration-300 ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
            <ExploreHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onFilterClick={() => setShowFilters(true)}
                onViewModeChange={setViewMode}
                viewMode={viewMode}
                locationText={locationText}
            />

            <CategoryTabs
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
            />

            <DiscoveryFeed
                category={selectedCategory !== "all" ? selectedCategory : undefined}
                searchQuery={searchQuery || undefined}
                userLat={lat || undefined}
                userLng={lng || undefined}
                viewMode={viewMode}
            />

            {showFilters && (
                <FilterModal
                    onClose={() => setShowFilters(false)}
                    category={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                />
            )}
        </div>
    );
}
