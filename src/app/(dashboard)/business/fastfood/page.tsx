export default function FastFoodModule() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-dark-100">Fast Food Management</h2>
            <p className="text-dark-400">
                Quick service operations and order management.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">127</p>
                    <p className="text-sm text-dark-400">Today&apos;s Orders</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-orange">4.2 min</p>
                    <p className="text-sm text-dark-400">Avg. Prep Time</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-green">$2.4K</p>
                    <p className="text-sm text-dark-400">Today&apos;s Revenue</p>
                </div>
            </div>
        </div>
    );
}
