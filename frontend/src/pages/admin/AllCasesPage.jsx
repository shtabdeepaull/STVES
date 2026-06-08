// ============================================================
// All Cases Page - Admin reviews, approves, dismisses, and tracks payments
// Phase 3: payment update button connected to backend API
// ============================================================
import { useState } from 'react';
import { FileWarning, Filter, Check, X, CreditCard, RotateCcw } from 'lucide-react';
import useStore from '../../store/useStore';

const money = (amount) => `৳${Number(amount || 0).toLocaleString()}`;

export default function AllCasesPage() {
  const { violations, updateViolationStatus, addLog, currentUser } = useStore();

  const [filter, setFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  let filtered = filter === 'all'
    ? violations
    : filter === 'paid'
      ? violations.filter(v => v.paymentStatus === 'paid')
      : filter === 'unpaid'
        ? violations.filter(v => v.paymentStatus === 'unpaid')
        : violations.filter(v => v.status === filter);

  if (searchQ) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter(v =>
      (v.caseId || '').toLowerCase().includes(q) ||
      (v.plateNumber || '').toLowerCase().includes(q) ||
      (v.driverName || '').toLowerCase().includes(q) ||
      (v.officerName || '').toLowerCase().includes(q)
    );
  }

  const handleStatusChange = async (violationId, caseId, status) => {
    try {
      setUpdatingId(violationId);
      await updateViolationStatus(violationId, status);

      if (currentUser) {
        addLog({
          userId: currentUser.id,
          userName: currentUser.name,
          action: `Case ${status === 'approved' ? 'Approved' : 'Dismissed'}`,
          details: `Case ${caseId} has been ${status} by ${currentUser.name}.`,
          type: 'admin',
        });
      }
    } finally {
      setUpdatingId('');
    }
  };

  const handlePaymentChange = async (violationId, caseId, paymentStatus) => {
    try {
      setUpdatingId(violationId);
      await updateViolationStatus(violationId, paymentStatus);

      if (currentUser) {
        addLog({
          userId: currentUser.id,
          userName: currentUser.name,
          action: `Payment ${paymentStatus === 'paid' ? 'Marked Paid' : 'Marked Unpaid'}`,
          details: `Payment for case ${caseId} has been marked as ${paymentStatus}.`,
          type: 'admin',
        });
      }
    } finally {
      setUpdatingId('');
    }
  };

  const statusBadge = (status) => {
    if (status === 'pending') return 'bg-orange-100 text-orange-700';
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'dismissed') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  };

  const paymentBadge = (paymentStatus) => {
    if (paymentStatus === 'paid') return 'bg-blue-100 text-blue-700';
    if (paymentStatus === 'waived') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">All Enforcement Cases</h1>
        <p className="text-sm text-gray-500 mt-1">Review, approve, dismiss, and update E-Challan payment status.</p>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="Search by case ID, plate, driver, or officer..."
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-400" />
          {['all', 'pending', 'approved', 'dismissed', 'paid', 'unpaid'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                filter === f ? 'bg-[#0f4c81] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cases table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileWarning size={40} className="mx-auto mb-3 opacity-30" />
            <p>No cases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Case ID</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Vehicle</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Driver</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Violation</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Fine</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Officer</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Payment</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => {
                  const isUpdating = updatingId === c.id;
                  const paymentStatus = c.paymentStatus || 'unpaid';

                  return (
                    <tr key={c.id || c._id || c.caseId} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{c.caseId}</p>
                        <p className="text-[10px] text-gray-400">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Date missing'}
                        </p>
                      </td>

                      <td className="px-5 py-3 text-gray-600">{c.plateNumber || 'N/A'}</td>
                      <td className="px-5 py-3 text-gray-600">{c.driverName || 'N/A'}</td>

                      <td className="px-5 py-3">
                        <p className="text-gray-600 max-w-[220px] truncate">
                          {c.description || c.violationLabel || c.violationType || 'N/A'}
                        </p>
                      </td>

                      <td className="px-5 py-3 font-semibold text-gray-800">
                        {money(c.fineAmount)}
                      </td>

                      <td className="px-5 py-3 text-gray-600">{c.officerName || 'N/A'}</td>

                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(c.status)}`}>
                          {(c.status || 'pending').charAt(0).toUpperCase() + (c.status || 'pending').slice(1)}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${paymentBadge(paymentStatus)}`}>
                          {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {c.status === 'pending' && (
                            <>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(c.id, c.caseId, 'approved')}
                                className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                                title="Approve"
                              >
                                <Check size={14} />
                              </button>

                              <button
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(c.id, c.caseId, 'dismissed')}
                                className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                title="Dismiss"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}

                          {c.status === 'approved' && paymentStatus !== 'paid' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handlePaymentChange(c.id, c.caseId, 'paid')}
                              className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                              title="Mark as Paid"
                            >
                              <CreditCard size={14} />
                            </button>
                          )}

                          {c.status === 'approved' && paymentStatus === 'paid' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handlePaymentChange(c.id, c.caseId, 'unpaid')}
                              className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                              title="Mark as Unpaid"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
