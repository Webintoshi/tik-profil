export default function RealEstateModule() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-dark-100">Real Estate Management</h2>
            <p className="text-dark-400">
                Property listings, client management, and sales tracking.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">67</p>
                    <p className="text-sm text-dark-400">Active Listings</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">23</p>
                    <p className="text-sm text-dark-400">Pending Sales</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-green">$12.4M</p>
                    <p className="text-sm text-dark-400">Portfolio Value</p>
                </div>
            </div>
        </div>
    );
}
