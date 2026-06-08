// ============================================================
// Blacklist & Suspensions Page - Admin manages vehicle/user restrictions
// ============================================================
import { useState } from 'react';
import { ShieldAlert, Car, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore';
export default function BlacklistPage() {
    const { vehicles, users, suspendVehicle, blacklistVehicle, activateVehicle, updateUserStatus, addLog, currentUser } = useStore();
    const [tab, setTab] = useState('vehicles');
    const flaggedVehicles = vehicles.filter(v => v.status !== 'active');
    const flaggedUsers = users.filter(u => u.status !== 'active');
    const handleVehicleAction = (vehicleId, plate, action) => {
        if (action === 'suspend')
            suspendVehicle(vehicleId);
        else if (action === 'blacklist')
            blacklistVehicle(vehicleId);
        else
            activateVehicle(vehicleId);
        if (currentUser) {
            addLog({
                userId: currentUser.id,
                userName: currentUser.name,
                action: `Vehicle ${action === 'activate' ? 'Activated' : action === 'suspend' ? 'Suspended' : 'Blacklisted'}`,
                details: `Vehicle ${plate} has been ${action === 'activate' ? 'activated' : action === 'suspend' ? 'suspended' : 'blacklisted'}.`,
                type: 'admin',
            });
        }
    };
    return (<div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldAlert size={24} className="text-red-500"/>
          Blacklist & Suspensions
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage restricted vehicles and users.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('vehicles')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${tab === 'vehicles' ? 'bg-[#0f4c81] text-white' : 'bg-gray-100 text-gray-600'}`}>
          <Car size={16}/>
          Vehicles ({flaggedVehicles.length} flagged)
        </button>
        <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${tab === 'users' ? 'bg-[#0f4c81] text-white' : 'bg-gray-100 text-gray-600'}`}>
          <Ban size={16}/>
          Users ({flaggedUsers.length} flagged)
        </button>
      </div>

      {tab === 'vehicles' ? (<div className="space-y-4">
          {/* All vehicles with action buttons */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Plate</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Vehicle</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Owner</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Safety</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vehicles.map(v => (<tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{v.plateNumber}</td>
                      <td className="px-5 py-3 text-gray-600">{v.brand} {v.model}</td>
                      <td className="px-5 py-3 text-gray-600">{v.ownerName}</td>
                      <td className="px-5 py-3">
                        <span className={`font-medium ${v.safetyScore >= 80 ? 'text-green-600' :
                    v.safetyScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{v.safetyScore}/100</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === 'active' ? 'bg-green-100 text-green-700' :
                    v.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'}`}>{v.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {v.status !== 'active' && (<button onClick={() => handleVehicleAction(v.id, v.plateNumber, 'activate')} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="Activate">
                              <CheckCircle size={14}/>
                            </button>)}
                          {v.status !== 'suspended' && (<button onClick={() => handleVehicleAction(v.id, v.plateNumber, 'suspend')} className="p-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200" title="Suspend">
                              <AlertTriangle size={14}/>
                            </button>)}
                          {v.status !== 'blacklisted' && (<button onClick={() => handleVehicleAction(v.id, v.plateNumber, 'blacklist')} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200" title="Blacklist">
                              <Ban size={14}/>
                            </button>)}
                        </div>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>
        </div>) : (<div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.filter(u => u.role !== 'admin').map(u => (<tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{u.role}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700' :
                    u.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'}`}>{u.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {u.status !== 'active' && (<button onClick={() => { updateUserStatus(u.id, 'active'); }} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                            <CheckCircle size={14}/>
                          </button>)}
                        {u.status !== 'suspended' && (<button onClick={() => { updateUserStatus(u.id, 'suspended'); }} className="p-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200">
                            <AlertTriangle size={14}/>
                          </button>)}
                        {u.status !== 'blacklisted' && (<button onClick={() => { updateUserStatus(u.id, 'blacklisted'); }} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                            <Ban size={14}/>
                          </button>)}
                      </div>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>)}
    </div>);
}
