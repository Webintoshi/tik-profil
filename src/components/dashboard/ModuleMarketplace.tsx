"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { Search, ChevronDown, Check, X, Loader2 } from "lucide-react";
import {
    MODULE_CATEGORIES,
    MODULE_REGISTRY,
    getModulesGroupedByCategory,
    searchModules,
    type ModuleDefinition,
    type CategoryDefinition
} from "@/lib/ModuleRegistry";
import clsx from "clsx";

interface ModuleMarketplaceProps {
    selectedModules: string[];
    onToggleModule: (moduleId: string) => void;
    onClose: () => void;
}

export function ModuleMarketplace({
    selectedModules,
    onToggleModule,
    onClose
}: ModuleMarketplaceProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [savingModules, setSavingModules] = useState<Set<string>>(new Set());

    const groupedModules = useMemo(() => getModulesGroupedByCategory(), []);
    const searchResults = useMemo(() => searchModules(searchQuery), [searchQuery]);
    const isSearching = searchQuery.trim().length > 0;

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
        // Optimistic UI - toggle immediately
        setSavingModules(prev => new Set(prev).add(moduleId));
        onToggleModule(moduleId);

        // Simulate save delay for visual feedback
        setTimeout(() => {
            setSavingModules(prev => {
                const next = new Set(prev);
                next.delete(moduleId);
                return next;
            });
        }, 500);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8"
        >
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-dark-950/80 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-dark-700/50 overflow-hidden"
                style={{
                    background: "rgba(28, 28, 30, 0.95)",
                    backdropFilter: "blur(40px)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700/50">
                    <div>
                        <h2 className="text-xl font-semibold text-dark-100">Modül Marketi</h2>
                        <p className="text-sm text-dark-500 mt-1">
                            {selectedModules.length} modül seçili · {MODULE_REGISTRY.length} toplam modül
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-dark-700 transition-colors"
                    >
                        <X className="h-5 w-5 text-dark-400" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-dark-700/50">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Modül Ara..."
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue transition-colors text-lg"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-dark-600"
                            >
                                <X className="h-4 w-4 text-dark-400" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isSearching ? (
                        // Search Results
                        <div className="space-y-2">
                            <p className="text-sm text-dark-500 px-2">
                                &quot;{searchQuery}&quot; için {searchResults.length} sonuç
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {searchResults.map(module => (
                                    <ModuleCard
                                        key={module.id}
                                        module={module}
                                        isSelected={selectedModules.includes(module.id)}
                                        isSaving={savingModules.has(module.id)}
                                        onToggle={() => handleToggle(module.id)}
                                    />
                                ))}
                            </div>
                            {searchResults.length === 0 && (
                                <div className="text-center py-8 text-dark-500">
                                    Sonuç bulunamadı
                                </div>
                            )}
                        </div>
                    ) : (
                        // Category Accordions
                        MODULE_CATEGORIES.map(category => (
                            <CategoryAccordion
                                key={category.id}
                                category={category}
                                modules={groupedModules[category.id]}
                                isExpanded={expandedCategories.has(category.id)}
                                selectedModules={selectedModules}
                                savingModules={savingModules}
                                onToggleCategory={() => toggleCategory(category.id)}
                                onToggleModule={handleToggle}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-dark-700/50 flex items-center justify-between">
                    <span className="text-sm text-dark-400">
                        {selectedModules.length} modül aktif
                    </span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors"
                    >
                        Kaydet ve Kapat
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Category Accordion Component
function CategoryAccordion({
    category,
    modules,
    isExpanded,
    selectedModules,
    savingModules,
    onToggleCategory,
    onToggleModule,
}: {
    category: CategoryDefinition;
    modules: ModuleDefinition[];
    isExpanded: boolean;
    selectedModules: string[];
    savingModules: Set<string>;
    onToggleCategory: () => void;
    onToggleModule: (id: string) => void;
}) {
    const activeCount = modules.filter(m => selectedModules.includes(m.id)).length;
    const Icon = category.icon;

    return (
        <div className="rounded-xl border border-dark-700/50 overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggleCategory}
                className="w-full flex items-center justify-between p-4 hover:bg-dark-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                    >
                        <Icon className="h-5 w-5" style={{ color: category.color }} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-medium text-dark-100">{category.label}</h3>
                        <p className="text-xs text-dark-500">{modules.length} modül</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {activeCount > 0 && (
                        <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${category.color}20`, color: category.color }}
                        >
                            {activeCount} aktif
                        </span>
                    )}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="h-5 w-5 text-dark-400" />
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
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modules.map(module => (
                                <ModuleCard
                                    key={module.id}
                                    module={module}
                                    isSelected={selectedModules.includes(module.id)}
                                    isSaving={savingModules.has(module.id)}
                                    onToggle={() => onToggleModule(module.id)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Module Card Component
function ModuleCard({
    module,
    isSelected,
    isSaving,
    onToggle,
}: {
    module: ModuleDefinition;
    isSelected: boolean;
    isSaving: boolean;
    onToggle: () => void;
}) {
    const Icon = module.icon;

    return (
        <motion.button
            onClick={onToggle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={clsx(
                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                isSelected
                    ? "border-accent-green/50 bg-accent-green/10"
                    : "border-dark-700 hover:border-dark-600 bg-dark-800/50"
            )}
        >
            <div
                className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${module.color}20` }}
            >
                <Icon className="h-5 w-5" style={{ color: module.color }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-dark-100 truncate">{module.label}</p>
                <p className="text-xs text-dark-500 truncate">{module.description}</p>
            </div>
            <div className="flex-shrink-0">
                {isSaving ? (
                    <Loader2 className="h-5 w-5 text-dark-400 animate-spin" />
                ) : isSelected ? (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-6 w-6 rounded-full bg-accent-green flex items-center justify-center"
                    >
                        <Check className="h-4 w-4 text-white" />
                    </motion.div>
                ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-dark-600" />
                )}
            </div>
        </motion.button>
    );
}
