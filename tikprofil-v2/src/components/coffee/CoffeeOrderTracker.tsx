"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle, ChefHat, Package } from "lucide-react";

interface OrderTrackerProps {
    orderId: string;
}

interface OrderData {
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    estimated_ready_at: string;
}

const statusSteps = [
    { key: "pending", label: "Sipariş Alındı", icon: Clock },
    { key: "confirmed", label: "Onaylandı", icon: CheckCircle },
    { key: "preparing", label: "Hazırlanıyor", icon: ChefHat },
    { key: "ready", label: "Hazır", icon: Package },
];

export default function CoffeeOrderTracker({ orderId }: OrderTrackerProps) {
    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            const res = await fetch(`/api/coffee/orders/${orderId}/track`);
            const json = await res.json();
            if (json.success) setOrder(json.data);
            setLoading(false);
        };

        fetchOrder();
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [orderId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center p-8 text-white/40">
                Sipariş bulunamadı
            </div>
        );
    }

    const getCurrentStepIndex = () => {
        if (order.status === "cancelled") return -1;
        if (order.status === "completed") return statusSteps.length;
        return statusSteps.findIndex(s => s.key === order.status);
    };

    const currentStep = getCurrentStepIndex();

    return (
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.08] p-6 max-w-md mx-auto">
            <div className="text-center mb-6">
                <p className="text-white/40 text-sm">Sipariş No</p>
                <p className="text-2xl font-bold text-white">#{order.order_number}</p>
            </div>

            <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
                <motion.div
                    className="absolute left-4 top-0 w-0.5 bg-gradient-to-b from-[#fe1e50] to-[#fe1e50]/50"
                    initial={{ height: 0 }}
                    animate={{ height: `${(currentStep + 1) * 25}%` }}
                    transition={{ duration: 0.5 }}
                />

                <div className="space-y-6">
                    {statusSteps.map((step, index) => {
                        const Icon = step.icon;
                        const isCompleted = index <= currentStep;
                        const isCurrent = index === currentStep;

                        return (
                            <motion.div
                                key={step.key}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative flex items-center gap-4"
                            >
                                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    isCompleted 
                                        ? "bg-[#fe1e50] text-white shadow-lg shadow-[#fe1e50]/30" 
                                        : "bg-white/10 text-white/40"
                                }`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className={isCurrent ? "font-semibold text-white" : "text-white/50"}>
                                    {step.label}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {order.status === "ready" && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center"
                >
                    <p className="text-emerald-400 font-semibold">Siparişiniz hazır!</p>
                    <p className="text-sm text-emerald-400/60">Lütfen teslimat noktasına gidiniz.</p>
                </motion.div>
            )}

            {order.status === "cancelled" && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <p className="text-red-400 font-semibold">Sipariş iptal edildi</p>
                </div>
            )}
        </div>
    );
}
