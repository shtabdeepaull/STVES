// ============================================================
// Manage Users Page - Admin can view, suspend, activate, blacklist users
// Phase 3: status action buttons connected to backend API
// ============================================================
import { useState } from 'react';
import { Search, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore';

export default function ManageUsersPage() {
  const { users, updateUserStatus, addLog, currentUser } = useStore();

  const [searchQ, setSearchQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');

  let filtered = roleFilter === 'all' ? users : users.filter(u => u.role === roleFilter);

  if (searchQ) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.nid || '').includes(q)
    );
  }

  const handleStatusChange = async (userId, userName, status) => {
    try {
      setUpdatingId(userId);
      await updateUserStatus(userId, status);

      if (currentUser) {
        addLog({
          userId: currentUser.id,
          userName: currentUser.name,
          action: `User ${status === 'active' ? 'Activated' : status === 'suspended' ? 'Suspended' : 'Blacklisted'}`,
          details: `User ${userName} has been ${status} by admin.`,
          type: 'admin',
        });
      }
    } finally {
      setUpdatingId('');
    }
  };

  const roleBadgeColors = {
    admin: 'bg-red-100 text-red-700',
    police: 'bg-blue-100 text-blue-700',
    driver: 'bg-green-100 text-green-700',
    owner: 'bg-purple-100 text-purple-700',
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-orange-100 text-orange-700',
    blacklisted: 'bg-red-100 text-red-700',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} registered users in the system.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by name, email, or NID..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {['all', 'admin', 'police', 'driver', 'owner'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                roleFilter === r ? 'bg-[#0f4c81] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">NID</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => {
                const isUpdating = updatingId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">{(u.name || 'U').charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {(u.role || 'user').charAt(0).toUpperCase() + (u.role || 'user').slice(1)}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-gray-600">{u.phone || 'N/A'}</td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">{u.nid || 'N/A'}</td>

                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[u.status] || 'bg-gray-100 text-gray-600'}`}>
                        {(u.status || 'active').charAt(0).toUpperCase() + (u.status || 'active').slice(1)}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      {u.role !== 'admin' && (
                        <div className="flex items-center gap-1">
                          {u.status !== 'active' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(u.id, u.name, 'active')}
                              className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                              title="Activate"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}

                          {u.status !== 'suspended' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(u.id, u.name, 'suspended')}
                              className="p-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50"
                              title="Suspend"
                            >
                              <AlertTriangle size={14} />
                            </button>
                          )}

                          {u.status !== 'blacklisted' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(u.id, u.name, 'blacklisted')}
                              className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                              title="Blacklist"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
