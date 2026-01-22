export default function ClinicsModule() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-dark-100">Clinic Management</h2>
            <p className="text-dark-400">
                Patient records, appointment scheduling, and medical billing.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">156</p>
                    <p className="text-sm text-dark-400">Registered Patients</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-dark-100">24</p>
                    <p className="text-sm text-dark-400">Today&apos;s Appointments</p>
                </div>
                <div className="glass-card p-6">
                    <p className="text-2xl font-bold text-accent-green">5</p>
                    <p className="text-sm text-dark-400">Doctors on Staff</p>
                </div>
            </div>
        </div>
    );
}
