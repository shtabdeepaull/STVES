// ============================================================
// Top Navigation Bar - Branding, notification, user menu
// Fix: admin-only pending case notification
// ============================================================
import { useState } from "react";
import { Menu, X, Shield, LogOut, User, Bell, ChevronDown } from "lucide-react";
import useStore from "../store/useStore";

export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  const { currentUser, logout } = useStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const violations = useStore((s) => s.violations || []);

  const isAdmin = currentUser?.role === "admin";

  const pendingCases = isAdmin
    ? violations.filter((v) => String(v.status || "").toLowerCase() === "pending")
        .length
    : 0;

  const roleLabels = {
    admin: "System Administrator",
    police: "Traffic Police Officer",
    driver: "Licensed Driver",
    owner: "Vehicle Owner",
  };

  const roleBadgeColors = {
    admin: "bg-red-100 text-red-700",
    police: "bg-blue-100 text-blue-700",
    driver: "bg-green-100 text-green-700",
    owner: "bg-purple-100 text-purple-700",
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setNotifOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>

            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-800 leading-tight">
                STVES
              </h1>
              <p className="text-[10px] text-gray-400 leading-tight -mt-0.5">
                Smart Traffic Verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setDropdownOpen(false);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 relative"
            >
              <Bell size={20} className="text-gray-600" />

              {isAdmin && pendingCases > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse-badge">
                  {pendingCases}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">
                    Notifications
                  </p>
                </div>

                {isAdmin && pendingCases > 0 ? (
                  <div className="px-4 py-3 hover:bg-gray-50">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-orange-600">
                        {pendingCases}
                      </span>{" "}
                      pending case(s) require review
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Just now</p>
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    No new notifications
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {currentUser?.name?.charAt(0) || "U"}
                </span>
              </div>

              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700 leading-tight">
                  {currentUser?.name || "User"}
                </p>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    roleBadgeColors[currentUser?.role || "driver"]
                  }`}
                >
                  {roleLabels[currentUser?.role || "driver"]}
                </span>
              </div>

              <ChevronDown size={16} className="text-gray-400 hidden md:block" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-700">
                    {currentUser?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {currentUser?.email || ""}
                  </p>
                </div>

                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  <User size={16} />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(dropdownOpen || notifOpen) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setDropdownOpen(false);
            setNotifOpen(false);
          }}
        />
      )}
    </nav>
  );
}