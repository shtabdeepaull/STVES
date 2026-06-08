// ============================================================
// Analytics Page - Visual statistics and data insights
// Uses pure CSS for charts (no external charting library)
// ============================================================
import { BarChart3, TrendingUp, FileWarning, Car, Users, Shield } from 'lucide-react';
import useStore from '../../store/useStore';
import { VIOLATION_TYPES } from '../../store/database';
export default function AnalyticsPage() {
    // IMPORTANT: do not call getStats() inside the Zustand selector.
    // useStore(s => s.getStats()) returns a new object every render and can cause
    // React 'Maximum update depth exceeded' in Zustand/React 19.
    useStore(s => s.stats); // subscribe to backend stats updates
    const getStats = useStore(s => s.getStats);
    const stats = getStats();
    const violations = useStore(s => s.violations);
    const vehicles = useStore(s => s.vehicles);
    // Violation type distribution
    const violationDist = VIOLATION_TYPES.map(vt => ({
        ...vt,
        count: violations.filter(v => v.violationType === vt.code).length,
    })).filter(v => v.count > 0).sort((a, b) => b.count - a.count);
    const maxCount = Math.max(...violationDist.map(v => v.count), 1);
    // Status distribution
    const statusDist = [
        { label: 'Pending', count: stats.pendingCases, color: 'bg-orange-500' },
        { label: 'Approved', count: stats.approvedCases, color: 'bg-green-500' },
        { label: 'Dismissed', count: violations.filter(v => v.status === 'dismissed').length, color: 'bg-red-500' },
        { label: 'Paid', count: stats.paidCases || violations.filter(v => v.paymentStatus === 'paid' || v.status === 'paid').length, color: 'bg-blue-500' },
    ];
    const totalCases = Math.max(violations.length, 1);
    // Vehicle status
    const vehicleStatusDist = [
        { label: 'Active', count: stats.activeVehicles, color: 'bg-green-500' },
        { label: 'Suspended', count: stats.suspendedVehicles, color: 'bg-orange-500' },
        { label: 'Blacklisted', count: stats.blacklistedVehicles, color: 'bg-red-500' },
    ];
    // Average safety score
    const avgSafety = vehicles.length > 0
        ? Math.round(vehicles.reduce((s, v) => s + v.safetyScore, 0) / vehicles.length)
        : 0;
    return (<div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 size={24} className="text-[#1a73e8]"/>
          Analytics Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">System-wide statistics and enforcement insights.</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'Total Revenue', value: `৳${stats.totalFines.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
            { label: 'Cases Issued', value: stats.totalViolations, icon: FileWarning, color: 'text-orange-600 bg-orange-50' },
            { label: 'Avg Safety Score', value: `${avgSafety}/100`, icon: Shield, color: 'text-blue-600 bg-blue-50' },
            { label: 'System Users', value: stats.totalUsers, icon: Users, color: 'text-purple-600 bg-purple-50' },
        ].map((m, i) => {
            const Icon = m.icon;
            return (<div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
              <div className={`w-10 h-10 rounded-lg ${m.color} flex items-center justify-center mb-3`}>
                <Icon size={20}/>
              </div>
              <p className="text-2xl font-bold text-gray-800">{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </div>);
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Violation type bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Violations by Type</h3>
          {violationDist.length === 0 ? (<p className="text-sm text-gray-400 text-center py-8">No violation data yet</p>) : (<div className="space-y-3">
              {violationDist.map((v, i) => (<div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 truncate pr-2">{v.label}</span>
                    <span className="text-gray-800 font-medium">{v.count}</span>
                  </div>
                  <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-lg flex items-center justify-end pr-2" style={{ width: `${(v.count / maxCount) * 100}%`, minWidth: '20px' }}>
                      <span className="text-[10px] text-white font-bold">{v.count}</span>
                    </div>
                  </div>
                </div>))}
            </div>)}
        </div>

        {/* Case status distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Case Status Distribution</h3>
          
          {/* Donut-like display */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-40 h-40 rounded-full border-8 border-gray-100 flex items-center justify-center relative">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-800">{violations.length}</p>
                <p className="text-xs text-gray-400">Total Cases</p>
              </div>
            </div>
          </div>

          {/* Horizontal bar breakdown */}
          <div className="h-4 rounded-full overflow-hidden flex mb-4 bg-gray-100">
            {statusDist.map((s, i) => (s.count > 0 && (<div key={i} className={`${s.color} h-full`} style={{ width: `${(s.count / totalCases) * 100}%` }}/>)))}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {statusDist.map((s, i) => (<div key={i} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${s.color}`}/>
                <span className="text-sm text-gray-600">{s.label}: <strong>{s.count}</strong></span>
              </div>))}
          </div>
        </div>

        {/* Vehicle status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Car size={18}/>
            Vehicle Status Overview
          </h3>
          <div className="space-y-4">
            {vehicleStatusDist.map((s, i) => (<div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{s.label}</span>
                  <span className="font-medium text-gray-800">{s.count}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${(s.count / Math.max(vehicles.length, 1)) * 100}%`, minWidth: s.count > 0 ? '8px' : '0' }}/>
                </div>
              </div>))}
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Total Vehicles: <strong className="text-gray-700">{vehicles.length}</strong></p>
          </div>
        </div>

        {/* Fine collection summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18}/>
            Fine Collection Summary
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-600">Total Fines Issued</p>
              <p className="text-3xl font-bold text-green-700">৳{stats.totalFines.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Average Fine</p>
                <p className="text-lg font-bold text-gray-800">
                  ৳{violations.length > 0 ? Math.round(stats.totalFines / violations.length).toLocaleString() : 0}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Highest Fine</p>
                <p className="text-lg font-bold text-gray-800">
                  ৳{violations.length > 0 ? Math.max(...violations.map(v => v.fineAmount)).toLocaleString() : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
