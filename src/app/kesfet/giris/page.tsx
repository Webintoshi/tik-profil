import { CustomerPhoneOtpCard } from "@/components/kesfet/CustomerPhoneOtpCard";

export default function KesfetLoginPage() {
    return (
        <main className="min-h-screen bg-[#F3F6F4] px-4 py-8">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
                <div className="mb-6">
                    <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-600">
                        Tık Profil
                    </p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                        Hesabına telefonla gir
                    </h1>
                    <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">
                        Şifre yok, tarayıcı yok. Cep telefonuna gelen kodla güvenli giriş yap.
                    </p>
                </div>

                <CustomerPhoneOtpCard redirectTo="/kesfet/profile" />
            </div>
        </main>
    );
}
