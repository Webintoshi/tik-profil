export default function HotelsModule() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-dark-100">Hotels Management</h2>
            <p className="text-dark-400">
                Manage bookings, rooms, and guest services for your hotel business.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">24</p>
                    <p className="text-sm text-dark-400">Active Rooms</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">18</p>
                    <p className="text-sm text-dark-400">Today&apos;s Bookings</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-green">92%</p>
                    <p className="text-sm text-dark-400">Occupancy Rate</p>
                </div>
            </div>
        </div>
    );
}
