// ============================================================
// Admin Dashboard - System overview with key metrics
// ============================================================
import { Users, Car, FileWarning, Shield, AlertTriangle, TrendingUp, Clock, Ban } from 'lucide-react';
import useStore from '../../store/useStore';
export default function AdminDashboard({ onNavigate }) {
    // IMPORTANT: do not call getStats() inside the Zustand selector.
    // useStore(s => s.getStats()) returns a new object every render and can cause
    // React 'Maximum update depth exceeded' in Zustand/React 19.
    useStore(s => s.stats); // subscribe to backend stats updates
    const getStats = useStore(s => s.getStats);
    const stats = getStats();
    const violations = useStore(s => s.violations);
    const activityLogs = useStore(s => s.activityLogs);
    const metrics = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600', trend: '+3 this month' },
        { label: 'Registered Vehicles', value: stats.totalVehicles, icon: Car, color: 'bg-green-50 text-green-600', trend: `${stats.activeVehicles} active` },
        { label: 'Total Cases', value: stats.totalViolations, icon: FileWarning, color: 'bg-orange-50 text-orange-600', trend: `${stats.pendingCases} pending` },
        { label: 'Total Fines', value: `৳${stats.totalFines.toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600', trend: 'All time' },
        { label: 'Police Officers', value: stats.totalPolice, icon: Shield, color: 'bg-cyan-50 text-cyan-600', trend: 'Active' },
        { label: 'Pending Review', value: stats.pendingCases, icon: Clock, color: 'bg-yellow-50 text-yellow-600', trend: 'Awaiting approval' },
        { label: 'Suspended Vehicles', value: stats.suspendedVehicles, icon: AlertTriangle, color: 'bg-red-50 text-red-600', trend: 'Under review' },
        { label: 'Blacklisted', value: stats.blacklistedVehicles, icon: Ban, color: 'bg-gray-100 text-gray-600', trend: 'Permanently blocked' },
    ];
    return (<div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">System Administrator Dashboard</h1>
        <p className="text-blue-200 text-sm mt-1">Welcome back, Admin. Here's your system overview.</p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
            const Icon = m.icon;
            return (<div key={i} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-lg ${m.color} flex items-center justify-center mb-3`}>
                <Icon size={20}/>
              </div>
              <p className="text-2xl font-bold text-gray-800">{m.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
              <p className="text-[10px] text-gray-400 mt-1">{m.trend}</p>
            </div>);
        })}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <button onClick={() => onNavigate('all-cases')} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left group">
          <FileWarning size={24} className="text-orange-500 mb-2"/>
          <p className="font-semibold text-gray-800">Review Cases</p>
          <p className="text-xs text-gray-400 mt-1">{stats.pendingCases} pending approval</p>
        </button>
        <button onClick={() => onNavigate('manage-users')} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left group">
          <Users size={24} className="text-blue-500 mb-2"/>
          <p className="font-semibold text-gray-800">Manage Users</p>
          <p className="text-xs text-gray-400 mt-1">{stats.totalUsers} registered users</p>
        </button>
        <button onClick={() => onNavigate('blacklist')} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left group">
          <Shield size={24} className="text-red-500 mb-2"/>
          <p className="font-semibold text-gray-800">Blacklist & Suspensions</p>
          <p className="text-xs text-gray-400 mt-1">{stats.suspendedVehicles + stats.blacklistedVehicles} flagged</p>
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent violations */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Cases</h3>
            <button onClick={() => onNavigate('all-cases')} className="text-xs text-blue-600 hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {violations.slice(0, 5).map(v => (<div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">{v.caseId}</p>
                  <p className="text-xs text-gray-400">{v.plateNumber} • by {v.officerName}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                v.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'}`}>
                  {v.status}
                </span>
              </div>))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Activity</h3>
            <button onClick={() => onNavigate('activity-logs')} className="text-xs text-blue-600 hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {activityLogs.slice(0, 5).map(log => (<div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${log.type === 'verification' ? 'bg-blue-400' :
                log.type === 'case' ? 'bg-orange-400' :
                    log.type === 'admin' ? 'bg-red-400' :
                        log.type === 'auth' ? 'bg-green-400' : 'bg-gray-400'}`}/>
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate">{log.action}</p>
                  <p className="text-xs text-gray-400 truncate">{log.details}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {log.userName} • {new Date(log.timestamp).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
                  </p>
                </div>
              </div>))}
          </div>
        </div>
      </div>
    </div>);
}
