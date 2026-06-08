// ============================================================
// Profile Page - View user's own profile details
// ============================================================
import { User, Mail, Phone, CreditCard, Shield, Calendar } from 'lucide-react';
import useStore from '../store/useStore';
export default function ProfilePage() {
    const currentUser = useStore(s => s.currentUser);
    if (!currentUser)
        return null;
    const roleLabels = {
        admin: 'System Administrator',
        police: 'Traffic Police Officer',
        driver: 'Licensed Driver',
        owner: 'Vehicle Owner',
    };
    const roleBadgeColors = {
        admin: 'bg-red-100 text-red-700',
        police: 'bg-blue-100 text-blue-700',
        driver: 'bg-green-100 text-green-700',
        owner: 'bg-purple-100 text-purple-700',
    };
    return (<div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Profile header */}
        <div className="bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto border-4 border-white/30">
            <span className="text-3xl font-bold text-white">{currentUser.name.charAt(0)}</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-3">{currentUser.name}</h2>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${roleBadgeColors[currentUser.role]}`}>
            {roleLabels[currentUser.role]}
          </span>
        </div>

        {/* Profile details */}
        <div className="p-6 space-y-4">
          <ProfileField icon={<User size={18}/>} label="Full Name" value={currentUser.name}/>
          <ProfileField icon={<Mail size={18}/>} label="Email Address" value={currentUser.email}/>
          <ProfileField icon={<Phone size={18}/>} label="Phone Number" value={currentUser.phone}/>
          <ProfileField icon={<CreditCard size={18}/>} label="NID Number" value={currentUser.nid}/>
          <ProfileField icon={<Shield size={18}/>} label="Account Status" value={currentUser.status} badge/>
          {currentUser.badge && (<ProfileField icon={<Shield size={18}/>} label="Badge Number" value={currentUser.badge}/>)}
          {currentUser.station && (<ProfileField icon={<Shield size={18}/>} label="Station" value={currentUser.station}/>)}
          <ProfileField icon={<Calendar size={18}/>} label="Member Since" value={new Date(currentUser.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'long', year: 'numeric'
        })}/>
          <ProfileField icon={<CreditCard size={18}/>} label="User ID" value={currentUser.id}/>
        </div>
      </div>
    </div>);
}
function ProfileField({ icon, label, value, badge }) {
    const statusColors = {
        active: 'bg-green-100 text-green-700',
        suspended: 'bg-orange-100 text-orange-700',
        blacklisted: 'bg-red-100 text-red-700',
    };
    return (<div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        {badge ? (<span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${statusColors[value] || 'bg-gray-100 text-gray-700'}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>) : (<p className="text-sm font-medium text-gray-700">{value}</p>)}
      </div>
    </div>);
}
