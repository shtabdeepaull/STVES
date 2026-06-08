// ============================================================
// Sidebar Navigation - Role-based menu items
// ============================================================
import { LayoutDashboard, Search, QrCode, FileWarning, Car, Users, BarChart3, ShieldAlert, ClipboardList, IdCard, History, UserCircle } from 'lucide-react';
import useStore from '../store/useStore';
const menuItems = [
    // Police items
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'police', 'driver', 'owner'] },
    { id: 'verify', label: 'Verify Vehicle/Driver', icon: Search, roles: ['police'] },
    { id: 'qr-scan', label: 'QR Scanner', icon: QrCode, roles: ['police'] },
    { id: 'create-case', label: 'Create E-Challan', icon: FileWarning, roles: ['police'] },
    { id: 'cases', label: 'My Cases', icon: ClipboardList, roles: ['police'] },
    // Admin items
    { id: 'all-cases', label: 'All Cases', icon: ClipboardList, roles: ['admin'] },
    { id: 'manage-users', label: 'Manage Users', icon: Users, roles: ['admin'] },
    { id: 'manage-vehicles', label: 'Manage Vehicles', icon: Car, roles: ['admin'] },
    { id: 'blacklist', label: 'Blacklist & Suspensions', icon: ShieldAlert, roles: ['admin'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
    { id: 'activity-logs', label: 'Activity Logs', icon: History, roles: ['admin'] },
    // Driver items
    { id: 'my-license', label: 'My License', icon: IdCard, roles: ['driver'] },
    { id: 'my-violations', label: 'My Violations', icon: FileWarning, roles: ['driver'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['driver'] },
    // Owner items
    { id: 'my-vehicles', label: 'My Vehicles', icon: Car, roles: ['owner'] },
    { id: 'assign-drivers', label: 'Assign Drivers', icon: Users, roles: ['owner'] },
    { id: 'owner-violations', label: 'Vehicle Violations', icon: FileWarning, roles: ['owner'] },
    { id: 'owner-profile', label: 'My Profile', icon: UserCircle, roles: ['owner'] },
];
export default function Sidebar({ isOpen, currentPage, onNavigate, onClose }) {
    const currentUser = useStore(s => s.currentUser);
    const role = currentUser?.role || 'driver';
    const filteredItems = menuItems.filter(item => item.roles.includes(role));
    // Group items by section
    const sections = [];
    if (role === 'police') {
        sections.push({ title: 'Overview', items: filteredItems.filter(i => i.id === 'dashboard') }, { title: 'Enforcement', items: filteredItems.filter(i => ['verify', 'qr-scan', 'create-case', 'cases'].includes(i.id)) });
    }
    else if (role === 'admin') {
        sections.push({ title: 'Overview', items: filteredItems.filter(i => i.id === 'dashboard') }, { title: 'Management', items: filteredItems.filter(i => ['all-cases', 'manage-users', 'manage-vehicles', 'blacklist'].includes(i.id)) }, { title: 'Reports', items: filteredItems.filter(i => ['analytics', 'activity-logs'].includes(i.id)) });
    }
    else if (role === 'driver') {
        sections.push({ title: 'Overview', items: filteredItems.filter(i => i.id === 'dashboard') }, { title: 'My Info', items: filteredItems.filter(i => ['my-license', 'my-violations', 'profile'].includes(i.id)) });
    }
    else {
        sections.push({ title: 'Overview', items: filteredItems.filter(i => i.id === 'dashboard') }, { title: 'Vehicle Management', items: filteredItems.filter(i => ['my-vehicles', 'assign-drivers', 'owner-violations', 'owner-profile'].includes(i.id)) });
    }
    return (<>
      {/* Mobile overlay */}
      {isOpen && (<div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose}/>)}

      {/* Sidebar */}
      <aside className={`
          fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200
          z-40 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}>
        <div className="p-4">
          {sections.map((section, idx) => (<div key={idx} className="mb-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (<button key={item.id} onClick={() => { onNavigate(item.id); onClose(); }} className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-150
                        ${isActive
                        ? 'bg-[#0f4c81] text-white shadow-md shadow-blue-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                      `}>
                      <Icon size={18}/>
                      <span>{item.label}</span>
                    </button>);
            })}
              </div>
            </div>))}
        </div>

        {/* Sidebar footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {currentUser?.name?.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{currentUser?.badge || currentUser?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>);
}
