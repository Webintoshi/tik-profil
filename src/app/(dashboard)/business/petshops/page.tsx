export default function PetShopsModule() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-dark-100">Pet Shop Management</h2>
            <p className="text-dark-400">
                Pet inventory, grooming services, and customer tracking.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">89</p>
                    <p className="text-sm text-dark-400">Pets in Inventory</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">12</p>
                    <p className="text-sm text-dark-400">Grooming Appointments</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-green">245</p>
                    <p className="text-sm text-dark-400">Loyal Customers</p>
                </div>
            </div>
        </div>
    );
}
