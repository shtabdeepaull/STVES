// ============================================================
// My Cases Page - Police officer views their issued cases
// Fix: safely render backend location object { address, city, lat, lng }
// ============================================================
import { useState } from 'react';
import { FileWarning, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import useStore from '../../store/useStore';

const locationToText = (location) => {
  if (!location) return 'No location provided';

  if (typeof location === 'string') {
    return location;
  }

  if (typeof location === 'object') {
    const parts = [
      location.address,
      location.city,
      location.lat && location.lng ? `${location.lat}, ${location.lng}` : '',
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'No location provided';
  }

  return String(location);
};

const safeText = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return locationToText(value);
  return String(value);
};

export default function MyCasesPage() {
  const currentUser = useStore(s => s.currentUser);
  const violations = useStore(s => s.violations);
  const [filter, setFilter] = useState('all');

  const myCases = violations.filter(v => {
    const officerId = v.officerId || v.officer?._id || v.officer?.id || v.officer;
    return officerId === currentUser?.id || officerId === currentUser?._id;
  });

  const filteredCases =
    filter === 'all'
      ? myCases
      : filter === 'paid'
        ? myCases.filter(v => v.paymentStatus === 'paid' || v.status === 'paid')
        : myCases.filter(v => v.status === filter);

  const countByFilter = (f) => {
    if (f === 'paid') {
      return myCases.filter(v => v.paymentStatus === 'paid' || v.status === 'paid').length;
    }
    return myCases.filter(v => v.status === f).length;
  };

  const getDisplayStatus = (item) => {
    if (item.paymentStatus === 'paid') return 'paid';
    return item.status || 'pending';
  };

  const statusColors = {
    pending: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    dismissed: 'bg-red-100 text-red-700',
    paid: 'bg-blue-100 text-blue-700',
  };

  const statusIcons = {
    pending: Clock,
    approved: CheckCircle,
    dismissed: XCircle,
    paid: CheckCircle,
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Cases</h1>
          <p className="text-sm text-gray-500 mt-1">{myCases.length} total cases issued</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        {['all', 'pending', 'approved', 'dismissed', 'paid'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-[#0f4c81] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && ` (${countByFilter(f)})`}
          </button>
        ))}
      </div>

      {/* Cases list */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <FileWarning size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No cases found</p>
          </div>
        ) : (
          filteredCases.map(c => {
            const displayStatus = getDisplayStatus(c);
            const StatusIcon = statusIcons[displayStatus] || Clock;
            const fineAmount = Number(c.fineAmount) || 0;

            return (
              <div
                key={c.id || c._id || c.caseId}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColors[displayStatus] || statusColors.pending}`}>
                      <StatusIcon size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {safeText(c.caseId, 'Case ID missing')}
                      </p>

                      <p className="text-xs text-gray-400 mt-0.5">
                        {safeText(c.plateNumber, 'Unknown plate')} • {safeText(c.driverName, 'Unknown driver')}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {safeText(c.description || c.violationLabel || c.violationType, 'No description')}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        📍 {locationToText(c.location)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[displayStatus] || statusColors.pending}`}>
                      {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                    </span>

                    <p className="text-lg font-bold text-gray-800 mt-1">
                      ৳{fineAmount.toLocaleString()}
                    </p>

                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Date missing'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
