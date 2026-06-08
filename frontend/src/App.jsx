// ============================================================
// STVES - Smart Traffic Verification & Enforcement System
// Main Application Entry Point
// Handles routing, layout, and role-based page rendering
// ============================================================
import { useEffect, useState } from 'react';
import useStore from './store/useStore';
import PublicVerifyPage from "./pages/PublicVerifyPage";
// Layout components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
// Police pages
import PoliceDashboard from './pages/police/PoliceDashboard';
import VerifyPage from './pages/police/VerifyPage';
import QRScanPage from './pages/police/QRScanPage';
import CreateCasePage from './pages/police/CreateCasePage';
import MyCasesPage from './pages/police/MyCasesPage';
// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AllCasesPage from './pages/admin/AllCasesPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import ManageVehiclesPage from './pages/admin/ManageVehiclesPage';
import BlacklistPage from './pages/admin/BlacklistPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import ActivityLogsPage from './pages/admin/ActivityLogsPage';
// Driver pages
import DriverDashboard from './pages/driver/DriverDashboard';
import MyLicensePage from './pages/driver/MyLicensePage';
import MyViolationsPage from './pages/driver/MyViolationsPage';
// Owner pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MyVehiclesPage from './pages/owner/MyVehiclesPage';
import AssignDriversPage from './pages/owner/AssignDriversPage';
export default function App() {
    const { isAuthenticated, currentUser, authLoading, initAuth, fetchDashboardData } = useStore();
    const [showLogin, setShowLogin] = useState(false);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);

    useEffect(() => {
        initAuth();
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchDashboardData();
        }
    }, [isAuthenticated, currentUser?.id]);

    const pathname = window.location.pathname.replace(/\/$/, "");

if (pathname === "/public-verify") {
    return <PublicVerifyPage />;
}

    if (authLoading) {
        return (<div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-[#0f4c81] rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-sm text-gray-500">Loading STVES...</p>
          </div>
        </div>);
    }

    // If not authenticated, show landing or login
    if (!isAuthenticated) {
        if (showLogin) {
            return <LoginPage />;
        }
        return <LandingPage onLogin={() => setShowLogin(true)}/>;
    }
    const role = currentUser?.role || 'driver';
    // Navigate to a page
    const navigate = (page) => {
        setCurrentPage(page);
        window.scrollTo(0, 0);
    };
    // Render the correct page based on current page + role
    const renderPage = () => {
        switch (currentPage) {
            // ---- POLICE PAGES ----
            case 'dashboard':
                if (role === 'police')
                    return <PoliceDashboard onNavigate={navigate}/>;
                if (role === 'admin')
                    return <AdminDashboard onNavigate={navigate}/>;
                if (role === 'driver')
                    return <DriverDashboard onNavigate={navigate}/>;
                if (role === 'owner')
                    return <OwnerDashboard onNavigate={navigate}/>;
                return <PoliceDashboard onNavigate={navigate}/>;
            case 'verify':
                return <VerifyPage onNavigate={navigate} setVerificationResult={setVerificationResult}/>;
            case 'qr-scan':
                return <QRScanPage onNavigate={navigate} setVerificationResult={setVerificationResult}/>;
            case 'create-case':
                return <CreateCasePage verificationResult={verificationResult}/>;
            case 'cases':
                return <MyCasesPage />;
            // ---- ADMIN PAGES ----
            case 'all-cases':
                return <AllCasesPage />;
            case 'manage-users':
                return <ManageUsersPage />;
            case 'manage-vehicles':
                return <ManageVehiclesPage />;
            case 'blacklist':
                return <BlacklistPage />;
            case 'analytics':
                return <AnalyticsPage />;
            case 'activity-logs':
                return <ActivityLogsPage />;
            // ---- DRIVER PAGES ----
            case 'my-license':
                return <MyLicensePage />;
            case 'my-violations':
                return <MyViolationsPage mode="driver"/>;
            case 'profile':
            case 'owner-profile':
                return <ProfilePage />;
            // ---- OWNER PAGES ----
            case 'my-vehicles':
                return <MyVehiclesPage />;
            case 'assign-drivers':
                return <AssignDriversPage />;
            case 'owner-violations':
                return <MyViolationsPage mode="owner"/>;
            default:
                return <PoliceDashboard onNavigate={navigate}/>;
        }
    };
    return (<div className="min-h-screen bg-[#f0f4f8]">
      {/* Top navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen}/>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} currentPage={currentPage} onNavigate={navigate} onClose={() => setSidebarOpen(false)}/>

      {/* Main content */}
      <main className="pt-16 lg:pl-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>);
}
