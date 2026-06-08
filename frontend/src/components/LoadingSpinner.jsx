// ============================================================
// Loading Spinner Components
// Various loading states for different contexts
// ============================================================
import { Shield } from 'lucide-react';
// Simple spinner
export function Spinner({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
    };
    return (<div className={`
        ${sizes[size]}
        rounded-full border-gray-200 border-t-[#0f4c81]
        animate-spin
        ${className}
      `}/>);
}
// Full page loading overlay
export function FullPageLoader({ message = 'Loading...' }) {
    return (<div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] rounded-2xl flex items-center justify-center animate-pulse">
          <Shield size={32} className="text-white"/>
        </div>
        <Spinner size="lg" className="mx-auto mb-3"/>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>);
}
// Inline loading for buttons
export function ButtonLoader() {
    return (<div className="flex items-center gap-2">
      <Spinner size="sm" className="border-white/30 border-t-white"/>
      <span>Processing...</span>
    </div>);
}
// Skeleton loader for cards
export function CardSkeleton() {
    return (<div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-lg"/>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"/>
          <div className="h-3 bg-gray-100 rounded w-3/4"/>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded"/>
        <div className="h-3 bg-gray-100 rounded w-5/6"/>
      </div>
    </div>);
}
// Table row skeleton
export function TableRowSkeleton({ columns = 5 }) {
    return (<tr className="animate-pulse">
      {Array(columns).fill(0).map((_, i) => (<td key={i} className="px-5 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"/>
        </td>))}
    </tr>);
}
// Verification loading animation
export function VerificationLoader() {
    return (<div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <div className="relative w-20 h-20 mx-auto mb-6">
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"/>
        {/* Spinning ring */}
        <div className="absolute inset-0 border-4 border-transparent border-t-[#0f4c81] rounded-full animate-spin"/>
        {/* Inner icon */}
        <div className="absolute inset-3 bg-blue-50 rounded-full flex items-center justify-center">
          <Shield size={24} className="text-[#0f4c81]"/>
        </div>
      </div>
      <p className="text-gray-700 font-semibold">Querying BRTA Database...</p>
      <p className="text-sm text-gray-400 mt-1">Verifying documents and compliance status</p>
      <div className="flex justify-center gap-1 mt-4">
        <span className="w-2 h-2 bg-[#0f4c81] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
        <span className="w-2 h-2 bg-[#0f4c81] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
        <span className="w-2 h-2 bg-[#0f4c81] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
      </div>
    </div>);
}
