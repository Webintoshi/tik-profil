export default function RestaurantsModule() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-dark-100">Restaurants Management</h2>
            <p className="text-dark-400">
                Manage tables, menus, and reservations for your restaurant.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">32</p>
                    <p className="text-sm text-dark-400">Total Tables</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">45</p>
                    <p className="text-sm text-dark-400">Today&apos;s Reservations</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-green">156</p>
                    <p className="text-sm text-dark-400">Menu Items</p>
                </div>
            </div>
        </div>
    );
}
