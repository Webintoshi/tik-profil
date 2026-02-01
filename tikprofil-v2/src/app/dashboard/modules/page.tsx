"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check, Loader2, X } from "lucide-react";
import {
    MODULE_CATEGORIES,
    MODULE_REGISTRY,
    getModulesGroupedByCategory,
    searchModules,
    type ModuleDefinition,
    type CategoryDefinition,
    TOTAL_MODULES,
    TOTAL_CATEGORIES
} from "@/lib/ModuleRegistry";
import clsx from "clsx";

// Liquid Metal Card Component
const LiquidMetalCard = ({ children, className = "", delay = 0 }: {
    children: React.ReactNode,
    className?: string,
    delay?: number
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
        className={`
            relative overflow-hidden rounded-2xl
            bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a]
            border border-white/[0.08]
            ${className}
        `}
        style={{
            boxShadow: `
                0 0 0 1px rgba(255,255,255,0.03),
                0 10px 40px -10px rgba(0,0,0,0.5),
                inset 0 1px 1px rgba(255,255,255,0.05)
            `
        }}
    >
        {/* Flowing Chrome Shine */}
        <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -skew-x-12 pointer-events-none"
            initial={{ x: '-200%' }}
            animate={{ x: '200%' }}
            transition={{
                duration: 4,
                repeat: Infinity,
                repeatDelay: 8,
                ease: "easeInOut"
            }}
        />
        <div className="relative z-10">{children}</div>
    </motion.div>
);

export default function ModulesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["yeme_icme"]));
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [savingModules, setSavingModules] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    const groupedModules = useMemo(() => getModulesGroupedByCategory(), []);
    const searchResults = useMemo(() => searchModules(searchQuery), [searchQuery]);
    const isSearching = searchQuery.trim().length > 0;

    const loadActiveModules = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/modules");
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.modules) {
                    setSelectedModules(data.modules);
                }
            }
        } catch (error) {
            console.error("Failed to load active modules:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadActiveModules();
    }, [loadActiveModules]);

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const handleToggle = async (moduleId: string) => {
        const isCurrentlySelected = selectedModules.includes(moduleId);
        setSavingModules(prev => new Set(prev).add(moduleId));

        const previousModules = [...selectedModules];
        if (isCurrentlySelected) {
            setSelectedModules(prev => prev.filter(m => m !== moduleId));
        } else {
            setSelectedModules(prev => [...prev, moduleId]);
        }

        try {
            const moduleInfo = MODULE_REGISTRY.find(m => m.id === moduleId);
            const response = await fetch("/api/admin/modules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    moduleId,
                    action: isCurrentlySelected ? "deactivate" : "activate",
                    label: moduleInfo?.label || moduleId,
                    description: moduleInfo?.description || "",
                    category: moduleInfo?.category || "hizmet",
                }),
            });

            const data = await response.json();
            if (!data.success) {
                setSelectedModules(previousModules);
                console.error("Failed to toggle module:", data.error);
            }
        } catch (error) {
            setSelectedModules(previousModules);
            console.error("Failed to toggle module:", error);
        } finally {
            setSavingModules(prev => {
                const next = new Set(prev);
                next.delete(moduleId);
                return next;
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <motion.div
                    className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
            >
                <h1
                    className="text-3xl font-black tracking-tight"
                    style={{
                        background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Modül Marketi
                </h1>
                <p className="text-sm text-gray-500">
                    {TOTAL_MODULES} modül · {TOTAL_CATEGORIES} kategori · <span className="text-emerald-400">{selectedModules.length} aktif</span>
                </p>
            </motion.div>


            {/* Search Bar with Liquid Metal Effect */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative group"
            >
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div
                    className="relative flex items-center"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                        borderRadius: '1rem',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.3)'
                    }}
                >
                    <Search className="absolute left-4 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Modül Ara..."
                        className="w-full bg-transparent pl-12 pr-12 py-4 text-lg focus:outline-none placeholder:text-gray-600 text-gray-200"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Content */}
            <div className="space-y-4">
                {isSearching ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 px-2">
                            &quot;{searchQuery}&quot; için {searchResults.length} sonuç
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {searchResults.map((module, i) => (
                                <ModuleCard
                                    key={module.id}
                                    module={module}
                                    isSelected={selectedModules.includes(module.id)}
                                    isSaving={savingModules.has(module.id)}
                                    onToggle={() => handleToggle(module.id)}
                                    delay={i * 0.05}
                                />
                            ))}
                        </div>
                        {searchResults.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                Sonuç bulunamadı
                            </div>
                        )}
                    </div>
                ) : (
                    MODULE_CATEGORIES.map((category, index) => (
                        <CategoryAccordion
                            key={category.id}
                            category={category}
                            modules={groupedModules[category.id]}
                            isExpanded={expandedCategories.has(category.id)}
                            selectedModules={selectedModules}
                            savingModules={savingModules}
                            onToggleCategory={() => toggleCategory(category.id)}
                            onToggleModule={handleToggle}
                            delay={index * 0.05}
                        />
                    ))
                )}
            </div>
        </div>
    );
}



// Category Accordion with Liquid Metal Design
function CategoryAccordion({
    category,
    modules,
    isExpanded,
    selectedModules,
    savingModules,
    onToggleCategory,
    onToggleModule,
    delay = 0
}: {
    category: CategoryDefinition;
    modules: ModuleDefinition[];
    isExpanded: boolean;
    selectedModules: string[];
    savingModules: Set<string>;
    onToggleCategory: () => void;
    onToggleModule: (id: string) => void;
    delay?: number;
}) {
    const activeCount = modules.filter(m => selectedModules.includes(m.id)).length;
    const Icon = category.icon;

    return (
        <LiquidMetalCard delay={delay}>
            {/* Header */}
            <button
                onClick={onToggleCategory}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center"
                        style={{
                            background: `linear-gradient(135deg, ${category.color}30 0%, ${category.color}10 100%)`,
                            boxShadow: `0 4px 15px ${category.color}20, inset 0 1px 1px rgba(255,255,255,0.1)`
                        }}
                    >
                        <Icon className="h-5 w-5" style={{ color: category.color }} />
                    </div>
                    <div className="text-left">
                        <h3
                            className="font-semibold"
                            style={{
                                background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            {category.label}
                        </h3>
                        <p className="text-xs text-gray-500">{modules.length} modül</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {activeCount > 0 && (
                        <span
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{
                                background: `linear-gradient(135deg, ${category.color}25 0%, ${category.color}10 100%)`,
                                color: category.color,
                                boxShadow: `inset 0 0 0 1px ${category.color}30`
                            }}
                        >
                            {activeCount} aktif
                        </span>
                    )}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    </motion.div>
                </div>
            </button>

            {/* Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {modules.map((module, i) => (
                                <ModuleCard
                                    key={module.id}
                                    module={module}
                                    isSelected={selectedModules.includes(module.id)}
                                    isSaving={savingModules.has(module.id)}
                                    onToggle={() => onToggleModule(module.id)}
                                    delay={i * 0.03}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </LiquidMetalCard>
    );
}

// Module Card with Metallic Design
function ModuleCard({
    module,
    isSelected,
    isSaving,
    onToggle,
    delay = 0
}: {
    module: ModuleDefinition;
    isSelected: boolean;
    isSaving: boolean;
    onToggle: () => void;
    delay?: number;
}) {
    const Icon = module.icon;

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.3 }}
            onClick={onToggle}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={clsx(
                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                isSelected
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]"
            )}
            style={isSelected ? {
                boxShadow: '0 0 20px rgba(16,185,129,0.15), inset 0 1px 1px rgba(255,255,255,0.1)'
            } : {
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
            }}
        >
            <div
                className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                style={{
                    background: `linear-gradient(135deg, ${module.color}30 0%, ${module.color}10 100%)`,
                    boxShadow: `0 4px 12px ${module.color}15, inset 0 1px 1px rgba(255,255,255,0.1)`
                }}
            >
                <Icon className="h-5 w-5" style={{ color: module.color }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-200 truncate group-hover:text-white transition-colors">{module.label}</p>
                <p className="text-xs text-gray-500 truncate">{module.description}</p>
            </div>
            <div className="flex-shrink-0">
                {isSaving ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                        <Loader2 className="h-5 w-5 text-gray-400" />
                    </motion.div>
                ) : isSelected ? (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-6 w-6 rounded-full flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            boxShadow: '0 4px 12px rgba(16,185,129,0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                        }}
                    >
                        <Check className="h-4 w-4 text-white" />
                    </motion.div>
                ) : (
                    <div
                        className="h-6 w-6 rounded-full border-2 border-gray-600 group-hover:border-gray-500 transition-colors"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}
                    />
                )}
            </div>
        </motion.button>
    );
}
