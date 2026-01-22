import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-4xl">🔍</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    İşletme Bulunamadı
                </h1>
                <p className="text-gray-500 mb-6">
                    Aradığınız işletme mevcut değil veya kaldırılmış olabilir.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                    Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );
}
