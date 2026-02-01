export default function GymsModule() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-dark-100">Gym Management</h2>
            <p className="text-dark-400">
                Membership management, class scheduling, and equipment tracking.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">342</p>
                    <p className="text-sm text-dark-400">Active Members</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">18</p>
                    <p className="text-sm text-dark-400">Classes Today</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-green">$18.5K</p>
                    <p className="text-sm text-dark-400">Monthly Revenue</p>
                </div>
            </div>
        </div>
    );
}
