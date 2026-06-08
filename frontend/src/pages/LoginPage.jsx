// ============================================================
// Login & Registration Page
// Supports role-based registration (driver, owner, police)
// Admin accounts are pre-seeded only
// ============================================================
import { useState } from 'react';
import { Shield, Eye, EyeOff, Mail, Lock, User, Phone, CreditCard, ChevronRight } from 'lucide-react';
import useStore from '../store/useStore';
export default function LoginPage() {
    const { login, register } = useStore();
    const [mode, setMode] = useState('login');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    // Register form state
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regNid, setRegNid] = useState('');
    const [regRole, setRegRole] = useState('driver');
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!loginEmail || !loginPassword) {
            setError('Please fill in all fields.');
            return;
        }
        setLoading(true);
        const result = await login(loginEmail, loginPassword);
        setLoading(false);
        if (!result.success) {
            setError(result.message);
        }
    };
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!regName || !regEmail || !regPassword || !regPhone || !regNid) {
            setError('Please fill in all fields.');
            return;
        }
        if (regPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (!/^\d{11}$/.test(regPhone)) {
            setError('Phone number must be 11 digits.');
            return;
        }
        setLoading(true);
        const result = await register({
            name: regName,
            email: regEmail,
            password: regPassword,
            phone: regPhone,
            nid: regNid,
            role: regRole,
        });
        setLoading(false);
        if (result.success) {
            setSuccess('Registration successful! Please login.');
            setMode('login');
            setLoginEmail(regEmail);
            // Reset form
            setRegName('');
            setRegEmail('');
            setRegPassword('');
            setRegPhone('');
            setRegNid('');
        }
        else {
            setError(result.message);
        }
    };
    // Demo credentials for quick access
    const demoAccounts = [
        { role: 'Admin', email: 'admin@stves.com', password: '123456', color: 'bg-red-50 border-red-200 text-red-700' },
        { role: 'Driver', email: 'driver@stves.com', password: '123456', color: 'bg-green-50 border-green-200 text-green-700' },
    ];
    return (<div className="min-h-screen bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f4c81] flex flex-col">
      {/* Top branding bar */}
      <div className="text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
            <Shield size={28} className="text-white"/>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-white tracking-tight">STVES</h1>
            <p className="text-xs text-blue-200">Smart Traffic Verification & Enforcement System</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 pb-8 pt-4">
        <div className="w-full max-w-md">
          {/* Auth card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Tab switcher */}
            <div className="flex border-b border-gray-100">
              <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'login'
            ? 'text-[#0f4c81] border-b-2 border-[#0f4c81] bg-blue-50/50'
            : 'text-gray-400 hover:text-gray-600'}`}>
                Sign In
              </button>
              <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }} className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'register'
            ? 'text-[#0f4c81] border-b-2 border-[#0f4c81] bg-blue-50/50'
            : 'text-gray-400 hover:text-gray-600'}`}>
                Register
              </button>
            </div>

            <div className="p-6">
              {/* Error / Success messages */}
              {error && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-fade-in">
                  {error}
                </div>)}
              {success && (<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 animate-fade-in">
                  {success}
                </div>)}

              {mode === 'login' ? (
        /* ---------- LOGIN FORM ---------- */
        <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Enter your email" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter your password" className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? 'Signing in...' : 'Sign In to STVES'}
                    <ChevronRight size={18}/>
                  </button>
                </form>) : (
        /* ---------- REGISTER FORM ---------- */
        <form onSubmit={handleRegister} className="space-y-4">
                  {/* Role selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Register As</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setRegRole('driver')} className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${regRole === 'driver'
                ? 'border-[#0f4c81] bg-blue-50 text-[#0f4c81]'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        🚗 Driver
                      </button>
                      <button type="button" onClick={() => setRegRole('owner')} className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${regRole === 'owner'
                ? 'border-[#0f4c81] bg-blue-50 text-[#0f4c81]'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        🔑 Vehicle Owner
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Enter your full name" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="Enter your email" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input type="text" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">NID Number</label>
                      <div className="relative">
                        <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input type="text" value={regNid} onChange={e => setRegNid(e.target.value)} placeholder="NID Number" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type={showPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? 'Creating account...' : 'Create Account'}
                    <ChevronRight size={18}/>
                  </button>
                </form>)}
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">
              🔑 Demo Login Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(acc => (<button key={acc.role} onClick={() => {
                setMode('login');
                setLoginEmail(acc.email);
                setLoginPassword(acc.password);
                setError('');
            }} className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-3 text-left transition-all group">
                  <p className="text-sm font-semibold text-white">{acc.role}</p>
                  <p className="text-[10px] text-white/60 mt-0.5 truncate">{acc.email}</p>
                  <p className="text-[10px] text-white/40">pw: {acc.password}</p>
                </button>))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pb-4">
            <p className="text-xs text-white/40">
              © 2025 STVES — Metropolitan University, Sylhet
            </p>
            <p className="text-[10px] text-white/30 mt-1">
              CSE 436 Final Year Project | Supervised by Abu Jafar Md. Jakaria
            </p>
          </div>
        </div>
      </div>
    </div>);
}
