// ============================================================
// Form Input Components
// Reusable form elements with validation support
// ============================================================
import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
export function Input({ label, name, type = 'text', value, onChange, placeholder, required, disabled, error, success, hint, icon, className = '', }) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    return (<div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>)}
        <input id={name} name={name} type={isPassword && showPassword ? 'text' : type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={`
            w-full px-4 py-2.5 border rounded-xl text-sm transition-all
            focus:outline-none focus:ring-2 
            ${icon ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
            ${error
            ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
            : success
                ? 'border-green-300 focus:ring-green-100 focus:border-green-400'
                : 'border-gray-200 focus:ring-blue-100 focus:border-[#0f4c81]'}
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          `}/>
        {isPassword && (<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
          </button>)}
        {error && (<AlertCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500"/>)}
        {success && !error && (<CheckCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"/>)}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>);
}
export function Textarea({ label, name, value, onChange, placeholder, required, disabled, error, rows = 3, className = '', }) {
    return (<div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea id={name} name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} rows={rows} className={`
          w-full px-4 py-2.5 border rounded-xl text-sm resize-none transition-all
          focus:outline-none focus:ring-2
          ${error
            ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
            : 'border-gray-200 focus:ring-blue-100 focus:border-[#0f4c81]'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
        `}/>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>);
}
export function Select({ label, name, value, onChange, options, placeholder = 'Select...', required, disabled, error, className = '', }) {
    return (<div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select id={name} name={name} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={`
          w-full px-4 py-2.5 border rounded-xl text-sm transition-all
          focus:outline-none focus:ring-2
          ${error
            ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
            : 'border-gray-200 focus:ring-blue-100 focus:border-[#0f4c81]'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
        `}>
        <option value="">{placeholder}</option>
        {options.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>);
}
export function Checkbox({ label, name, checked, onChange, disabled, className = '', }) {
    return (<label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <input type="checkbox" name={name} checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} className="w-4 h-4 text-[#0f4c81] border-gray-300 rounded focus:ring-[#0f4c81]"/>
      <span className="text-sm text-gray-700">{label}</span>
    </label>);
}
export function RadioGroup({ label, name, value, onChange, options, inline, className = '', }) {
    return (<div className={className}>
      <p className="block text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className={`flex ${inline ? 'flex-row gap-4' : 'flex-col gap-2'}`}>
        {options.map(opt => (<label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={e => onChange(e.target.value)} className="w-4 h-4 text-[#0f4c81] border-gray-300 focus:ring-[#0f4c81]"/>
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>))}
      </div>
    </div>);
}
export function DateInput({ label, name, value, onChange, min, max, required, disabled, error, className = '', }) {
    return (<div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input id={name} name={name} type="date" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} disabled={disabled} className={`
          w-full px-4 py-2.5 border rounded-xl text-sm transition-all
          focus:outline-none focus:ring-2
          ${error
            ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
            : 'border-gray-200 focus:ring-blue-100 focus:border-[#0f4c81]'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
        `}/>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>);
}
