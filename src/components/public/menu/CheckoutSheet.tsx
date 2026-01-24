"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Check, MapPin, CreditCard, Phone, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { calculateItemTotal } from "@/contexts/CartContext";

interface CheckoutSheetProps {
    isOpen: boolean;
    onClose: () => void;
    theme?: "modern" | "classic";
}

export default function CheckoutSheet({ isOpen, onClose, theme = "modern" }: CheckoutSheetProps) {
    const cart = useCart();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"delivery" | "payment" | "confirm">("delivery");
    const isDark = theme === "modern";

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");

    const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery" | "table">("pickup");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [tableNumber, setTableNumber] = useState("");

    const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card" | "online">("cash");
    const [couponCode, setCouponCode] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    const [deliveryFee, setDeliveryFee] = useState(0);
    const [minOrderAmount, setMinOrderAmount] = useState(0);

    useEffect(() => {
        if (isOpen) {
            const savedName = localStorage.getItem("ff_customer_name");
            const savedPhone = localStorage.getItem("ff_customer_phone");
            if (savedName) setCustomerName(savedName);
            if (savedPhone) setCustomerPhone(savedPhone);
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`/api/fastfood/settings?businessSlug=${cart.businessSlug}`);
                const data = await res.json();
                if (data.success && data.settings) {
                    setDeliveryFee(data.settings.deliveryFee || 0);
                    setMinOrderAmount(data.settings.minOrderAmount || 0);
                    if (data.settings.deliveryFee && deliveryType === "delivery") {
                        setDeliveryFee(data.settings.deliveryFee);
                    }
                }
            } catch (error) {
                console.error("Settings fetch error:", error);
            }
        };
        if (cart.businessSlug) {
            fetchSettings();
        }
    }, [cart.businessSlug, deliveryType]);

    useEffect(() => {
        if (cart.tableId) {
            setDeliveryType("table");
            setTableNumber(cart.tableId);
        } else if (deliveryType === "pickup") {
            setDeliveryFee(0);
        }
    }, [deliveryType, cart.tableId]);

    const subtotal = cart.total;
    const discount = couponDiscount;
    const total = subtotal + deliveryFee - discount;

    const validateCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponDiscount(0);
            return;
        }

        setValidatingCoupon(true);
        try {
            const res = await fetch("/api/fastfood/validate-coupon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessSlug: cart.businessSlug,
                    code: couponCode,
                    subtotal
                })
            });
            const data = await res.json();

            if (data.valid) {
                setCouponDiscount(data.discount || 0);
                toast.success(`${data.discount} TL indirim uygulandı!`);
            } else {
                setCouponDiscount(0);
                toast.error(data.message || "Geçersiz kupon");
            }
        } catch (error) {
            console.error("Coupon validation error:", error);
            setCouponDiscount(0);
            toast.error("Kupon doğrulanamadı");
        } finally {
            setValidatingCoupon(false);
        }
    };

    useEffect(() => {
        if (couponCode.trim()) {
            const timer = setTimeout(() => {
                validateCoupon();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [couponCode, subtotal]);

    const handleSubmit = async () => {
        if (!customerName.trim()) {
            toast.error("İsim gereklidir");
            return;
        }
        if (!customerPhone.trim()) {
            toast.error("Telefon gereklidir");
            return;
        }
        if (deliveryType === "delivery" && !deliveryAddress.trim()) {
            toast.error("Adres gereklidir");
            return;
        }
        if (deliveryType === "table" && !tableNumber.trim()) {
            toast.error("Masa numarası gereklidir");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/fastfood/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessSlug: cart.businessSlug,
                    items: cart.items,
                    customer: {
                        name: customerName,
                        phone: customerPhone,
                        email: customerEmail || undefined
                    },
                    delivery: {
                        type: deliveryType,
                        address: deliveryType === "delivery" ? deliveryAddress : undefined,
                        tableNumber: deliveryType === "table" ? tableNumber : undefined
                    },
                    payment: {
                        method: paymentMethod
                    },
                    couponCode: couponCode || undefined,
                    orderNote: cart.orderNote,
                    subtotal,
                    discountAmount: discount,
                    deliveryFee,
                    total
                })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem("ff_customer_name", customerName);
                localStorage.setItem("ff_customer_phone", customerPhone);
                cart.clearCart();
                toast.success("Siparişiniz başarıyla alındı!");
                onClose();
            } else {
                toast.error(data.error || "Sipariş oluşturulamadı");
            }
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border ${isDark
                ? "bg-[#1c1c1e] border-white/5"
                : "bg-white border-gray-100"
                }`}>
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-800"
                        }`}
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>Siparişi Tamamla</h2>

                <div className="space-y-6">
                    <div>
                        <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Müşteri Bilgileri</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="İsim Soyisim"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? "bg-[#0d0d0d] border border-white/10 text-white placeholder-gray-500"
                                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                                    }`}
                            />
                            <input
                                type="tel"
                                placeholder="Telefon"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? "bg-[#0d0d0d] border border-white/10 text-white placeholder-gray-500"
                                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                                    }`}
                            />
                            <input
                                type="email"
                                placeholder="E-posta (opsiyonel)"
                                value={customerEmail}
                                onChange={e => setCustomerEmail(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? "bg-[#0d0d0d] border border-white/10 text-white placeholder-gray-500"
                                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                                    }`}
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Teslimat</h3>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                                { value: "pickup" as const, label: "Gel Al", icon: ShoppingCart },
                                { value: "delivery" as const, label: "Adrese Teslim", icon: MapPin },
                                { value: "table" as const, label: "Masa", icon: Phone }
                            ].map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => setDeliveryType(type.value)}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${deliveryType === type.value
                                        ? (isDark ? "border-blue-500 bg-blue-500/10" : "border-orange-500 bg-orange-500/10")
                                        : (isDark ? "border-white/5 hover:border-white/10 bg-white/5" : "border-gray-200 hover:border-gray-300 bg-white")
                                        }`}
                                >
                                    <type.icon className={`w-5 h-5 ${deliveryType === type.value ? (isDark ? "text-blue-500" : "text-orange-500") : "text-gray-400"}`} />
                                    <span className={`text-xs font-medium ${deliveryType === type.value ? (isDark ? "text-blue-500" : "text-orange-500") : "text-gray-400"}`}>
                                        {type.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {deliveryType === "delivery" && (
                            <input
                                type="text"
                                placeholder="Teslimat adresi"
                                value={deliveryAddress}
                                onChange={e => setDeliveryAddress(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                    ? "bg-[#0d0d0d] border border-white/10 text-white placeholder-gray-500"
                                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                                    }`}
                            />
                        )}
                        {deliveryType === "table" && (
                            cart.tableId ? (
                                <div className={`w-full px-4 py-3 rounded-xl border flex items-center gap-3 ${isDark ? "bg-[#0d0d0d] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                                    }`}>
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-sm">QR ile masa seçili</span>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Masa numarası"
                                    value={tableNumber}
                                    onChange={e => setTableNumber(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                                        ? "bg-[#0d0d0d] border border-white/10 text-white placeholder-gray-500"
                                        : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                                        }`}
                                />
                            )
                        )}
                    </div>

                    <div>
                        <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Ödeme</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: "cash" as const, label: "Nakit" },
                                { value: "credit_card" as const, label: "Kredi Kartı" },
                                { value: "online" as const, label: "Online" }
                            ].map(method => (
                                <button
                                    key={method.value}
                                    onClick={() => setPaymentMethod(method.value)}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === method.value
                                        ? (isDark ? "border-blue-500 bg-blue-500/10" : "border-orange-500 bg-orange-500/10")
                                        : (isDark ? "border-white/5 hover:border-white/10 bg-white/5" : "border-gray-200 hover:border-gray-300 bg-white")
                                        }`}
                                >
                                    <CreditCard className={`w-5 h-5 ${paymentMethod === method.value ? (isDark ? "text-blue-500" : "text-orange-500") : "text-gray-400"}`} />
                                    <span className={`text-xs font-medium ${paymentMethod === method.value ? (isDark ? "text-blue-500" : "text-orange-500") : "text-gray-400"}`}>
                                        {method.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Kupon Kodu</h3>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Kupon kodu"
                                value={couponCode}
                                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                className={`w-full px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${isDark
                                    ? "bg-[#0d0d0d] border border-white/10 text-white placeholder-gray-500"
                                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                                    }`}
                            />
                            {validatingCoupon && (
                                <Loader2 className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin ${isDark ? "text-blue-500" : "text-orange-500"}`} />
                            )}
                        </div>
                        {discount > 0 && (
                            <p className="mt-2 text-sm text-green-500 font-medium">
                                ✓ {discount} TL indirim uygulandı
                            </p>
                        )}
                    </div>

                    <div className="border-t border-white/10 pt-4 space-y-2">
                        <div className="flex justify-between text-gray-400">
                            <span>Ara Toplam</span>
                            <span>₺{subtotal.toFixed(2)}</span>
                        </div>
                        {deliveryFee > 0 && (
                            <div className="flex justify-between text-gray-400">
                                <span>Teslimat Ücreti</span>
                                <span>₺{deliveryFee.toFixed(2)}</span>
                            </div>
                        )}
                        {discount > 0 && (
                            <div className="flex justify-between text-green-500">
                                <span>İndirim</span>
                                <span>-₺{discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                            <span>Toplam</span>
                            <span>₺{total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || cart.items.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-[#0A84FF] to-[#BF5AF2] hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Sipariş Oluşturuluyor...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                <span>Siparişi Onayla - ₺{total.toFixed(2)}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
