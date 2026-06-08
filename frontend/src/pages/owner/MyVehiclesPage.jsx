// ============================================================
// My Vehicles Page - Owner manages their vehicles + registration
// ============================================================
import { useState } from 'react';
import { Car, Plus, CheckCircle, XCircle, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import useStore from '../../store/useStore';
export default function MyVehiclesPage() {
    const { currentUser, vehicles, addVehicle, addLog } = useStore();
    const myVehicles = vehicles.filter(v => v.ownerId === currentUser?.id);
    const [showForm, setShowForm] = useState(false);
    const [expandedQR, setExpandedQR] = useState(null);
    // Form state
    const [form, setForm] = useState({
        plateNumber: '', vehicleType: 'Sedan', brand: '', model: '', year: 2024,
        color: '', engineNumber: '', chassisNumber: '',
        registrationDate: '', registrationExpiry: '', fitnessExpiry: '',
        taxTokenExpiry: '', routePermitExpiry: '', insuranceExpiry: '',
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        if (!form.plateNumber || !form.brand || !form.model || !form.engineNumber || !form.chassisNumber) {
            setFormError('Please fill in all required fields.');
            return;
        }
        // Check if plate already exists
        if (vehicles.find(v => v.plateNumber.toLowerCase() === form.plateNumber.toLowerCase())) {
            setFormError('A vehicle with this plate number already exists.');
            return;
        }
        setSubmitting(true);
        const result = await addVehicle({
            ...form,
            ownerId: currentUser?.id || '',
            ownerName: currentUser?.name || '',
            status: 'active',
            assignedDrivers: [],
        });
        setSubmitting(false);
        if (!result.success) {
            setFormError(result.message || 'Vehicle registration failed.');
            return;
        }
        if (currentUser) {
            addLog({
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'Vehicle Registered',
                details: `New vehicle registered: ${form.plateNumber} (${form.brand} ${form.model})`,
                type: 'system',
            });
        }
        setFormSuccess(result.message || `Vehicle ${form.plateNumber} registered successfully!`);
        setShowForm(false);
        setForm({
            plateNumber: '', vehicleType: 'Sedan', brand: '', model: '', year: 2024,
            color: '', engineNumber: '', chassisNumber: '',
            registrationDate: '', registrationExpiry: '', fitnessExpiry: '',
            taxTokenExpiry: '', routePermitExpiry: '', insuranceExpiry: '',
        });
    };
    const today = new Date().toISOString().split('T')[0];
    return (<div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Vehicles</h1>
          <p className="text-sm text-gray-500 mt-1">{myVehicles.length} vehicle(s) registered.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#0f4c81] text-white rounded-xl text-sm font-medium hover:bg-[#0a3d6a] flex items-center gap-2">
          {showForm ? <X size={16}/> : <Plus size={16}/>}
          {showForm ? 'Cancel' : 'Register New'}
        </button>
      </div>

      {formSuccess && (<div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-600 animate-fade-in flex items-center gap-2">
          <CheckCircle size={18}/> {formSuccess}
        </div>)}

      {/* Registration form */}
      {showForm && (<div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in">
          <h3 className="font-semibold text-gray-800 mb-4">Register New Vehicle</h3>
          {formError && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>)}
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <Input label="Plate Number *" value={form.plateNumber} onChange={v => setForm({ ...form, plateNumber: v })} placeholder="DHA-KA-XX-XXXX"/>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Vehicle Type</label>
              <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20">
                {['Sedan', 'SUV', 'Bus', 'Truck', 'Motorcycle', 'CNG', 'Rickshaw', 'Pickup', 'Van', 'Microbus'].map(t => (<option key={t}>{t}</option>))}
              </select>
            </div>
            <Input label="Brand *" value={form.brand} onChange={v => setForm({ ...form, brand: v })} placeholder="Toyota"/>
            <Input label="Model *" value={form.model} onChange={v => setForm({ ...form, model: v })} placeholder="Corolla"/>
            <Input label="Year" value={String(form.year)} onChange={v => setForm({ ...form, year: parseInt(v) || 2024 })} placeholder="2024"/>
            <Input label="Color" value={form.color} onChange={v => setForm({ ...form, color: v })} placeholder="White"/>
            <Input label="Engine Number *" value={form.engineNumber} onChange={v => setForm({ ...form, engineNumber: v })} placeholder="ENG-XXXX"/>
            <Input label="Chassis Number *" value={form.chassisNumber} onChange={v => setForm({ ...form, chassisNumber: v })} placeholder="CHS-XXXX"/>
            <Input label="Registration Date" type="date" value={form.registrationDate} onChange={v => setForm({ ...form, registrationDate: v })}/>
            <Input label="Registration Expiry" type="date" value={form.registrationExpiry} onChange={v => setForm({ ...form, registrationExpiry: v })}/>
            <Input label="Fitness Expiry" type="date" value={form.fitnessExpiry} onChange={v => setForm({ ...form, fitnessExpiry: v })}/>
            <Input label="Tax Token Expiry" type="date" value={form.taxTokenExpiry} onChange={v => setForm({ ...form, taxTokenExpiry: v })}/>
            <Input label="Route Permit Expiry" type="date" value={form.routePermitExpiry} onChange={v => setForm({ ...form, routePermitExpiry: v })}/>
            <Input label="Insurance Expiry" type="date" value={form.insuranceExpiry} onChange={v => setForm({ ...form, insuranceExpiry: v })}/>

            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting} className="w-full py-3 bg-[#0f4c81] text-white rounded-xl font-semibold text-sm hover:bg-[#0a3d6a] disabled:opacity-50">
                {submitting ? 'Registering...' : 'Register Vehicle'}
              </button>
            </div>
          </form>
        </div>)}

      {/* Vehicle cards */}
      <div className="space-y-4">
        {myVehicles.map(v => {
            return (<div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Car size={18} className="text-gray-400"/>
                    <h3 className="text-lg font-bold text-gray-800">{v.plateNumber}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === 'active' ? 'bg-green-100 text-green-700' :
                    v.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'}`}>{v.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{v.brand} {v.model} ({v.year}) | {v.vehicleType} | {v.color}</p>
                </div>
                <button onClick={() => setExpandedQR(expandedQR === v.id ? null : v.id)} className="bg-gray-50 p-2 rounded-lg hover:bg-gray-100">
                  <QRCodeSVG value={v.qrCode || `STVES-VEH:${v.plateNumber}`} size={40} level="M"/>
                </button>
              </div>

              {expandedQR === v.id && (<div className="mb-4 p-4 bg-gray-50 rounded-xl text-center animate-fade-in">
                  <QRCodeSVG value={v.qrCode || `STVES-VEH:${v.plateNumber}`} size={160} level="M"/>
                  <p className="text-xs text-gray-400 mt-2">Vehicle QR Code — Scannable by traffic officers</p>
                </div>)}

              {/* Document status grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <DocBadge label="Registration" date={v.registrationExpiry} today={today}/>
                <DocBadge label="Fitness" date={v.fitnessExpiry} today={today}/>
                <DocBadge label="Tax Token" date={v.taxTokenExpiry} today={today}/>
                <DocBadge label="Route Permit" date={v.routePermitExpiry} today={today}/>
                <DocBadge label="Insurance" date={v.insuranceExpiry} today={today}/>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500">Safety: </span>
                  <span className={`text-xs font-bold ${v.safetyScore >= 80 ? 'text-green-600' :
                    v.safetyScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{v.safetyScore}/100</span>
                </div>
              </div>
            </div>);
        })}
      </div>
    </div>);
}
// Reusable input component
function Input({ label, value, onChange, placeholder, type = 'text' }) {
    return (<div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
    </div>);
}
function DocBadge({ label, date, today }) {
    const expired = date < today;
    return (<div className={`flex items-center gap-1.5 p-2 rounded-lg text-xs ${expired ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
      {expired ? <XCircle size={12}/> : <CheckCircle size={12}/>}
      <span className="truncate">{label}: {expired ? 'Expired' : 'Valid'}</span>
    </div>);
}
