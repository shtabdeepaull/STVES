// ============================================================
// Police Officer Dashboard - Quick stats and recent activity
// ============================================================
import { Search, QrCode, FileWarning, Shield, AlertTriangle, Clock, Car } from 'lucide-react';
import useStore from '../../store/useStore';
export default function PoliceDashboard({ onNavigate }) {
    const currentUser = useStore(s => s.currentUser);
    const violations = useStore(s => s.violations);
    const vehicles = useStore(s => s.vehicles);
    // Get officer's cases
    const myCases = violations.filter(v => v.officerId === currentUser?.id);
    const pendingCases = myCases.filter(v => v.status === 'pending').length;
    const todayCases = myCases.filter(v => {
        const today = new Date().toISOString().split('T')[0];
        return v.createdAt.startsWith(today);
    }).length;
    const stats = [
        { label: 'Total Cases Issued', value: myCases.length, icon: FileWarning, color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-600' },
        { label: 'Pending Review', value: pendingCases, icon: Clock, color: 'bg-orange-500', lightColor: 'bg-orange-50 text-orange-600' },
        { label: 'Today\'s Cases', value: todayCases, icon: AlertTriangle, color: 'bg-red-500', lightColor: 'bg-red-50 text-red-600' },
        { label: 'Vehicles in System', value: vehicles.length, icon: Car, color: 'bg-green-500', lightColor: 'bg-green-50 text-green-600' },
    ];
    const quickActions = [
        { label: 'Verify Vehicle/Driver', icon: Search, page: 'verify', color: 'from-blue-500 to-blue-600' },
        { label: 'Scan QR Code', icon: QrCode, page: 'qr-scan', color: 'from-emerald-500 to-emerald-600' },
        { label: 'Create E-Challan', icon: FileWarning, page: 'create-case', color: 'from-orange-500 to-orange-600' },
    ];
    return (<div className="animate-fade-in space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold mt-1">{currentUser?.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-blue-200">Badge: {currentUser?.badge}</span>
              <span className="text-blue-300">•</span>
              <span className="text-sm text-blue-200">{currentUser?.station}</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Shield size={24}/>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (<div key={i} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-lg ${stat.lightColor} flex items-center justify-center mb-3`}>
                <Icon size={20}/>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>);
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (<button key={i} onClick={() => onNavigate(action.page)} className={`bg-gradient-to-br ${action.color} text-white rounded-xl p-5 text-left hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all`}>
                <Icon size={28} className="mb-3"/>
                <p className="font-semibold">{action.label}</p>
                <p className="text-sm text-white/70 mt-1">Click to proceed →</p>
              </button>);
        })}
        </div>
      </div>

      {/* Recent cases */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Cases</h2>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {myCases.length === 0 ? (<div className="p-8 text-center text-gray-400">
              <FileWarning size={40} className="mx-auto mb-3 opacity-30"/>
              <p>No cases issued yet</p>
              <p className="text-sm mt-1">Start by verifying a vehicle or driver</p>
            </div>) : (<div className="divide-y divide-gray-50">
              {myCases.slice(0, 5).map(c => (<div key={c.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${c.status === 'pending' ? 'bg-orange-400' :
                    c.status === 'approved' ? 'bg-green-400' :
                        c.status === 'dismissed' ? 'bg-red-400' : 'bg-blue-400'}`}/>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{c.caseId}</p>
                      <p className="text-xs text-gray-400">{c.plateNumber} — {c.driverName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    c.status === 'approved' ? 'bg-green-100 text-green-700' :
                        c.status === 'dismissed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">৳{c.fineAmount.toLocaleString()}</p>
                  </div>
                </div>))}
            </div>)}
        </div>
      </div>
    </div>);
}
