export default function SalonsModule() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-dark-100">Salon Management</h2>
            <p className="text-dark-400">
                Appointment booking, staff scheduling, and service tracking.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">28</p>
                    <p className="text-sm text-dark-400">Today&apos;s Appointments</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">8</p>
                    <p className="text-sm text-dark-400">Staff Members</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-green">45</p>
                    <p className="text-sm text-dark-400">Services Offered</p>
                </div>
            </div>
        </div>
    );
}
