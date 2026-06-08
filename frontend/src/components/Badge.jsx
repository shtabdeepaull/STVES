// ============================================================
// Badge Component
// Status indicators and labels
// ============================================================
import { CheckCircle, XCircle, Clock, AlertTriangle, Shield } from 'lucide-react';
export default function Badge({ variant, children, size = 'sm', icon = false }) {
    const variants = {
        success: 'bg-green-100 text-green-700 border-green-200',
        error: 'bg-red-100 text-red-700 border-red-200',
        warning: 'bg-orange-100 text-orange-700 border-orange-200',
        info: 'bg-blue-100 text-blue-700 border-blue-200',
        neutral: 'bg-gray-100 text-gray-700 border-gray-200',
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    const icons = {
        success: <CheckCircle size={12}/>,
        error: <XCircle size={12}/>,
        warning: <AlertTriangle size={12}/>,
        info: <Shield size={12}/>,
        neutral: null,
        pending: <Clock size={12}/>,
    };
    const sizes = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
    };
    return (<span className={`
        inline-flex items-center gap-1 rounded-full font-medium border
        ${variants[variant]}
        ${sizes[size]}
      `}>
      {icon && icons[variant]}
      {children}
    </span>);
}
export function StatusBadge({ status, size = 'sm' }) {
    const statusMap = {
        active: { variant: 'success', label: 'Active' },
        valid: { variant: 'success', label: 'Valid' },
        approved: { variant: 'success', label: 'Approved' },
        paid: { variant: 'success', label: 'Paid' },
        pending: { variant: 'pending', label: 'Pending' },
        suspended: { variant: 'warning', label: 'Suspended' },
        expired: { variant: 'error', label: 'Expired' },
        blacklisted: { variant: 'error', label: 'Blacklisted' },
        revoked: { variant: 'error', label: 'Revoked' },
        dismissed: { variant: 'error', label: 'Dismissed' },
    };
    const config = statusMap[status.toLowerCase()] || { variant: 'neutral', label: status };
    return (<Badge variant={config.variant} size={size} icon>
      {config.label}
    </Badge>);
}
export function SafetyScoreBadge({ score, showLabel = true }) {
    const getVariant = () => {
        if (score >= 80)
            return 'success';
        if (score >= 50)
            return 'warning';
        return 'error';
    };
    return (<Badge variant={getVariant()} size="md">
      {showLabel && 'Safety: '}
      {score}/100
    </Badge>);
}
