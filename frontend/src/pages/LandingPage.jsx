// ============================================================
// Landing Page - Public-facing overview of STVES
// Features hero, features grid, how it works, and CTA
// ============================================================
import { Shield, QrCode, Search, FileWarning, Car, Lock, Zap, ChevronRight, ArrowRight } from 'lucide-react';
export default function LandingPage({ onLogin }) {
    const features = [
        {
            icon: <Search size={24}/>,
            title: 'Instant Verification',
            desc: 'Verify vehicles and drivers in seconds using license plate numbers or digital IDs.',
            color: 'from-blue-500 to-blue-600',
        },
        {
            icon: <QrCode size={24}/>,
            title: 'QR Code Scanning',
            desc: 'Scan vehicle QR codes for immediate roadside compliance checks.',
            color: 'from-emerald-500 to-emerald-600',
        },
        {
            icon: <FileWarning size={24}/>,
            title: 'E-Challan System',
            desc: 'Issue digital violation cases instantly with automated fine calculation.',
            color: 'from-orange-500 to-orange-600',
        },
        {
            icon: <Car size={24}/>,
            title: 'Vehicle Management',
            desc: 'Complete vehicle registration, fitness tracking, and document management.',
            color: 'from-purple-500 to-purple-600',
        },
        {
            icon: <Lock size={24}/>,
            title: 'Role-Based Access',
            desc: 'Secure multi-level access for police, admins, drivers, and vehicle owners.',
            color: 'from-red-500 to-red-600',
        },
        {
            icon: <Zap size={24}/>,
            title: 'Real-time Analytics',
            desc: 'Dashboard with live stats, violation trends, and enforcement insights.',
            color: 'from-yellow-500 to-yellow-600',
        },
    ];
    const steps = [
        { step: '01', title: 'Scan or Search', desc: 'Officer scans QR code or enters license plate number' },
        { step: '02', title: 'Instant Verification', desc: 'System validates all documents against BRTA database' },
        { step: '03', title: 'Detect Violations', desc: 'Automated detection of expired or invalid documents' },
        { step: '04', title: 'Issue E-Challan', desc: 'Digital case created with unique ID and fine calculation' },
    ];
    return (<div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-white"/>
              </div>
              <span className="text-xl font-bold text-gray-800">STVES</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onLogin} className="px-5 py-2 bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] text-white rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] flex items-center gap-2">
                Login / Register
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f4c81]"/>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl"/>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"/>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
              <span className="text-xs font-medium text-white/80">Bangladesh Traffic Enforcement Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Smart Traffic
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"> Verification </span>
              & Enforcement
            </h1>

            <p className="text-lg text-blue-100/80 mb-8 leading-relaxed max-w-2xl mx-auto">
              A digital platform that replaces manual document checking with instant QR-based verification, 
              automated violation detection, and paperless E-Challan generation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={onLogin} className="px-8 py-3.5 bg-white text-[#0f4c81] rounded-xl font-semibold hover:shadow-xl hover:shadow-white/20 active:scale-[0.98] flex items-center gap-2">
                Get Started
                <ArrowRight size={18}/>
              </button>
              <a href="#features" className="px-8 py-3.5 border border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 active:scale-[0.98]">
                Explore Features
              </a>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-2xl mx-auto">
              {[
            { value: '< 2s', label: 'Verification Time' },
            { value: '4', label: 'User Roles' },
            { value: '16+', label: 'Violation Types' },
            { value: '100%', label: 'Digital Process' },
        ].map((stat, i) => (<div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-blue-200/70 mt-1">{stat.label}</p>
                </div>))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#1a73e8] uppercase tracking-wider mb-2">Core Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">Everything You Need for Modern Enforcement</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              From instant roadside verification to automated digital case management — all in one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (<div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group">
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#1a73e8] uppercase tracking-wider mb-2">Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">How STVES Works</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (<div key={i} className="relative">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow h-full">
                  <span className="text-4xl font-black text-[#0f4c81]/10">{step.step}</span>
                  <h3 className="text-lg font-semibold text-gray-800 mt-2 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (<div className="hidden lg:block absolute top-1/2 -right-3 z-10">
                    <ArrowRight size={20} className="text-gray-300"/>
                  </div>)}
              </div>))}
          </div>
        </div>
      </section>

      {/* Role overview */}
      <section className="py-20 bg-gradient-to-br from-[#0d1b2a] to-[#0f4c81]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">User Roles</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Built for Every Stakeholder</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
            { emoji: '👮', role: 'Traffic Police', desc: 'Verify vehicles, scan QR codes, issue E-Challans on the spot', color: 'border-blue-400/30' },
            { emoji: '🛡️', role: 'System Admin', desc: 'Monitor all activity, manage users, approve cases, control blacklists', color: 'border-red-400/30' },
            { emoji: '🚗', role: 'Driver', desc: 'View license status, check violation history, manage profile', color: 'border-green-400/30' },
            { emoji: '🔑', role: 'Vehicle Owner', desc: 'Register vehicles, assign drivers, track compliance', color: 'border-purple-400/30' },
        ].map((item, i) => (<div key={i} className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border ${item.color} hover:bg-white/10 transition-colors`}>
                <span className="text-4xl">{item.emoji}</span>
                <h3 className="text-lg font-semibold text-white mt-3 mb-2">{item.role}</h3>
                <p className="text-sm text-blue-200/70">{item.desc}</p>
              </div>))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Ready to Modernize Traffic Enforcement?</h2>
          <p className="text-gray-500 mb-8 text-lg">
            Experience the future of traffic law enforcement with STVES — fast, secure, and completely digital.
          </p>
          <button onClick={onLogin} className="px-8 py-3.5 bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] text-white rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-blue-200 active:scale-[0.98] flex items-center gap-2 mx-auto">
            Access the System
            <ArrowRight size={20}/>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield size={20} className="text-blue-400"/>
            <span className="text-lg font-bold text-white">STVES</span>
          </div>
          <p className="text-sm mb-1">Smart Traffic Verification & Enforcement System</p>
          <p className="text-xs">
            CSE 436 — Final Year Project | Metropolitan University, Sylhet
          </p>
          <p className="text-xs mt-1">
            Supervised by Abu Jafar Md. Jakaria | Developed by Md. Jamil Ahamad Alamin & Shtabdee Paul
          </p>
          <p className="text-xs text-gray-600 mt-3">© 2025 STVES. All rights reserved.</p>
        </div>
      </footer>
    </div>);
}
