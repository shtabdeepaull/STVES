// ============================================================
// STVES Global State Management using Zustand
// Handles auth, CRUD operations, and business logic
// ============================================================
import { create } from 'zustand';
import { seedUsers, seedLicenses, seedVehicles, seedViolations, seedActivityLogs, generateId, generateCaseId, VIOLATION_TYPES } from './database';
import api, { tokenStorage } from '../lib/api';

const normalizeId = (item) => item?._id || item?.id || '';
const toDateOnly = (value) => value ? String(value).slice(0, 10) : '';

const mapVehicleTypeForBackend = (type = 'car') => {
    const normalized = String(type).toLowerCase();
    if (['sedan', 'suv', 'car'].includes(normalized)) return 'car';
    if (['bus'].includes(normalized)) return 'bus';
    if (['truck', 'pickup'].includes(normalized)) return 'truck';
    if (['motorcycle', 'bike'].includes(normalized)) return 'motorcycle';
    if (['cng'].includes(normalized)) return 'cng';
    if (['microbus', 'van'].includes(normalized)) return 'microbus';
    return 'other';
};
const ownerFromVehicle = (vehicle) => vehicle?.owner || null;
const driverFromLicense = (license) => license?.driver || null;

const mapUser = (user = {}) => ({
    ...user,
    id: normalizeId(user),
    _id: normalizeId(user),
    status: user.status || 'active',
});

const mapVehicle = (vehicle = {}) => {
    const owner = ownerFromVehicle(vehicle);
    return {
        ...vehicle,
        id: normalizeId(vehicle),
        _id: normalizeId(vehicle),
        plateNumber: vehicle.registrationNumber || vehicle.plateNumber || '',
        registrationNumber: vehicle.registrationNumber || vehicle.plateNumber || '',
        ownerId: typeof owner === 'object' ? normalizeId(owner) : owner || vehicle.ownerId || '',
        ownerName: typeof owner === 'object' ? owner.name : vehicle.ownerName || '',
        vehicleType: vehicle.vehicleType || 'car',
        registrationDate: toDateOnly(vehicle.registrationDate),
        registrationExpiry: toDateOnly(vehicle.registrationExpiry),
        fitnessExpiry: toDateOnly(vehicle.fitnessExpiry),
        taxTokenExpiry: toDateOnly(vehicle.taxTokenExpiry),
        routePermitExpiry: toDateOnly(vehicle.routePermitExpiry || vehicle.registrationExpiry),
        insuranceExpiry: toDateOnly(vehicle.insuranceExpiry),
        assignedDrivers: (vehicle.assignedDrivers || []).map(d => typeof d === 'object' ? normalizeId(d) : d),
        qrCode: vehicle.qrCode || `STVES-VEH:${vehicle.registrationNumber || vehicle.plateNumber || ''}`,
        safetyScore: vehicle.safetyScore ?? 100,
        status: vehicle.status || 'active',
    };
};

const mapLicense = (license = {}) => {
    const driver = driverFromLicense(license);
    return {
        ...license,
        id: normalizeId(license),
        _id: normalizeId(license),
        driverId: typeof driver === 'object' ? normalizeId(driver) : driver || license.driverId || '',
        driverName: license.holderName || license.driverName || (typeof driver === 'object' ? driver.name : ''),
        category: license.licenseClass || license.category || '',
        issueDate: toDateOnly(license.issueDate),
        expiryDate: toDateOnly(license.expiryDate),
        status: license.status || 'valid',
    };
};

const mapViolation = (violation = {}) => {
    const vehicle = violation.vehicle;
    const driver = violation.driver;
    const officer = violation.officer;
    const license = violation.license;

    return {
        ...violation,
        id: normalizeId(violation),
        _id: normalizeId(violation),
        vehicleId: typeof vehicle === 'object' ? normalizeId(vehicle) : vehicle || violation.vehicleId || '',
        driverId: typeof driver === 'object' ? normalizeId(driver) : driver || violation.driverId || '',
        licenseId: typeof license === 'object' ? normalizeId(license) : license || violation.licenseId || '',
        officerId: typeof officer === 'object' ? normalizeId(officer) : officer || violation.officerId || '',
        plateNumber: typeof vehicle === 'object' ? vehicle.registrationNumber : violation.plateNumber || '',
        driverName: typeof driver === 'object' ? driver.name : violation.driverName || '',
        officerName: typeof officer === 'object' ? officer.name : violation.officerName || '',
        violationType: violation.violationCode || violation.violationType || '',
        violationLabel: violation.violationType || violation.violationCode || '',
        fineAmount: violation.fineAmount || 0,
        createdAt: violation.createdAt || violation.issuedAt || new Date().toISOString(),
        updatedAt: violation.updatedAt || violation.createdAt || new Date().toISOString(),
        paymentStatus: violation.paymentStatus || 'unpaid',
    };
};

const mapAssignment = (assignment = {}) => ({
    ...assignment,
    id: normalizeId(assignment),
    _id: normalizeId(assignment),
    vehicleId: typeof assignment.vehicle === 'object' ? normalizeId(assignment.vehicle) : assignment.vehicle,
    driverId: typeof assignment.driver === 'object' ? normalizeId(assignment.driver) : assignment.driver,
    ownerId: typeof assignment.owner === 'object' ? normalizeId(assignment.owner) : assignment.owner,
});

const mapLog = (log = {}) => ({
    ...log,
    id: normalizeId(log),
    userId: typeof log.officer === 'object' ? normalizeId(log.officer) : log.officer || log.userId || '',
    userName: typeof log.officer === 'object' ? log.officer.name : log.userName || 'System',
    action: log.searchType ? `${log.searchType} verification` : log.action || 'System Activity',
    details: log.searchValue ? `Searched ${log.searchType}: ${log.searchValue} — ${log.result}` : log.details || '',
    type: log.searchType ? 'verification' : log.type || 'system',
    timestamp: log.createdAt || log.verifiedAt || log.timestamp || new Date().toISOString(),
});

const buildStatsFromState = (state) => ({
    totalUsers: state.users.length,
    totalVehicles: state.vehicles.length,
    totalDrivers: state.users.filter(u => u.role === 'driver').length,
    totalPolice: state.users.filter(u => u.role === 'police').length,
    totalViolations: state.violations.length,
    pendingCases: state.violations.filter(v => v.status === 'pending').length,
    approvedCases: state.violations.filter(v => v.status === 'approved').length,
    dismissedCases: state.violations.filter(v => v.status === 'dismissed').length,
    paidCases: state.violations.filter(v => v.paymentStatus === 'paid' || v.status === 'paid').length,
    unpaidCases: state.violations.filter(v => v.paymentStatus === 'unpaid').length,
    totalFines: state.violations.reduce((sum, v) => sum + (Number(v.fineAmount) || 0), 0),
    activeVehicles: state.vehicles.filter(v => v.status === 'active').length,
    suspendedVehicles: state.vehicles.filter(v => v.status === 'suspended').length,
    blacklistedVehicles: state.vehicles.filter(v => v.status === 'blacklisted').length,
    validLicenses: state.licenses.filter(l => l.status === 'valid').length,
    expiredLicenses: state.licenses.filter(l => l.status === 'expired').length,
    activeAssignments: state.assignments?.filter(a => a.status === 'active').length || 0,
    totalVerificationLogs: state.verificationLogs?.length || 0,
});

const useStore = create((set, get) => ({
    // Initial state
    currentUser: tokenStorage.getUser(),
    isAuthenticated: !!tokenStorage.getToken(),
    authLoading: false,
    isLoading: false,
    apiError: '',
    stats: null,
    users: [...seedUsers],
    licenses: [...seedLicenses],
    vehicles: [...seedVehicles],
    violations: [...seedViolations],
    activityLogs: [...seedActivityLogs],
    assignments: [],
    verificationLogs: [],
    // -------- AUTH --------
    initAuth: async () => {
        const token = tokenStorage.getToken();
        if (!token) {
            set({ currentUser: null, isAuthenticated: false, authLoading: false });
            return;
        }

        try {
            set({ authLoading: true, apiError: '' });
            const data = await api.me();
            const user = mapUser(data.user);
            tokenStorage.setUser(user);
            set({ currentUser: user, isAuthenticated: true, authLoading: false });
            await get().fetchDashboardData();
        }
        catch (error) {
            tokenStorage.removeToken();
            set({ currentUser: null, isAuthenticated: false, authLoading: false, apiError: error.message });
        }
    },

    login: async (email, password) => {
        try {
            set({ authLoading: true, apiError: '' });
            const data = await api.login(email, password);
            const user = mapUser(data.user);
            tokenStorage.setToken(data.token);
            tokenStorage.setUser(user);
            set({ currentUser: user, isAuthenticated: true, authLoading: false });
            await get().fetchDashboardData();
            return { success: true, message: 'Login successful!' };
        }
        catch (error) {
            set({ authLoading: false, apiError: error.message });
            return { success: false, message: error.message || 'Login failed.' };
        }
    },

    logout: () => {
        tokenStorage.removeToken();
        set({ currentUser: null, isAuthenticated: false, stats: null, apiError: '' });
    },

    register: async (userData) => {
        try {
            set({ authLoading: true, apiError: '' });
            await api.register(userData);
            set({ authLoading: false });
            return { success: true, message: 'Registration successful!' };
        }
        catch (error) {
            set({ authLoading: false, apiError: error.message });
            return { success: false, message: error.message || 'Registration failed.' };
        }
    },

    fetchDashboardData: async () => {
        const user = get().currentUser;
        if (!user) return;

        try {
            set({ isLoading: true, apiError: '' });

            const tasks = [];
            if (user.role === 'admin') {
                tasks.push(api.getAnalyticsStats().then(data => set({ stats: data.stats })));
                tasks.push(api.getUsers().then(data => set({ users: (data.users || []).map(mapUser) })));
                tasks.push(api.getVehicles().then(data => set({ vehicles: (data.vehicles || []).map(mapVehicle) })));
                tasks.push(api.getLicenses().then(data => set({ licenses: (data.licenses || []).map(mapLicense) })));
                tasks.push(api.getViolations().then(data => set({ violations: (data.violations || []).map(mapViolation) })));
                tasks.push(api.getVerificationLogs().then(data => set({ verificationLogs: (data.logs || []).map(mapLog), activityLogs: (data.logs || []).map(mapLog) })));
                tasks.push(api.getAssignments().then(data => set({ assignments: (data.assignments || []).map(mapAssignment) })).catch(() => {}));
            }
            else if (user.role === 'police') {
                tasks.push(api.getVehicles().then(data => set({ vehicles: (data.vehicles || []).map(mapVehicle) })));
                tasks.push(api.getLicenses().then(data => set({ licenses: (data.licenses || []).map(mapLicense) })));
                tasks.push(api.getViolations().then(data => set({ violations: (data.violations || []).map(mapViolation) })));
                tasks.push(api.getVerificationLogs().then(data => set({ verificationLogs: (data.logs || []).map(mapLog), activityLogs: (data.logs || []).map(mapLog) })));
                tasks.push(api.getAssignments().then(data => set({ assignments: (data.assignments || []).map(mapAssignment) })).catch(() => {}));
            }
            else if (user.role === 'driver') {
                tasks.push(api.getMyLicenses().then(data => set({ licenses: (data.licenses || []).map(mapLicense) })));
                tasks.push(api.getMyViolations().then(data => set({ violations: (data.violations || []).map(mapViolation) })));
            }
            else if (user.role === 'owner') {
                tasks.push(api.getMyVehicles().then(data => set({ vehicles: (data.vehicles || []).map(mapVehicle) })));
                tasks.push(api.getMyAssignments().then(data => set({ assignments: (data.assignments || []).map(mapAssignment) })).catch(() => {}));
                tasks.push(api.getLicenses().then(data => set({ licenses: (data.licenses || []).map(mapLicense) })).catch(() => {}));
                tasks.push(api.getViolations().then(data => set({ violations: (data.violations || []).map(mapViolation) })).catch(() => {}));
                tasks.push(api.getUsers().then(data => set({ users: (data.users || []).map(mapUser) })).catch(() => {}));
            }

            await Promise.allSettled(tasks);

            // Sync active assignment IDs into each vehicle so existing UI pages can use vehicle.assignedDrivers.
            const latest = get();
            const activeAssignments = latest.assignments || [];
            if (activeAssignments.length > 0) {
                set({
                    vehicles: latest.vehicles.map(vehicle => ({
                        ...vehicle,
                        assignedDrivers: activeAssignments
                            .filter(a => a.status === 'active' && a.vehicleId === vehicle.id)
                            .map(a => a.driverId),
                    })),
                });
            }

            set({ isLoading: false });
        }
        catch (error) {
            set({ isLoading: false, apiError: error.message });
        }
    },

    refreshStats: async () => {
        try {
            const data = await api.getAnalyticsStats();
            set({ stats: data.stats });
            return data.stats;
        }
        catch (error) {
            set({ apiError: error.message });
            return get().getStats();
        }
    },
    // -------- VEHICLES --------
    addVehicle: async (vehicleData) => {
        try {
            set({ isLoading: true, apiError: '' });
            const payload = {
                registrationNumber: vehicleData.registrationNumber || vehicleData.plateNumber,
                vehicleType: mapVehicleTypeForBackend(vehicleData.vehicleType),
                brand: vehicleData.brand,
                model: vehicleData.model,
                year: Number(vehicleData.year) || new Date().getFullYear(),
                color: vehicleData.color,
                chassisNumber: vehicleData.chassisNumber,
                engineNumber: vehicleData.engineNumber,
                registrationDate: vehicleData.registrationDate || undefined,
                registrationExpiry: vehicleData.registrationExpiry || undefined,
                fitnessExpiry: vehicleData.fitnessExpiry || undefined,
                taxTokenExpiry: vehicleData.taxTokenExpiry || undefined,
                insuranceExpiry: vehicleData.insuranceExpiry || undefined,
            };

            const data = await api.createVehicle(payload);
            const mapped = mapVehicle(data.vehicle);
            set(state => ({ vehicles: [mapped, ...state.vehicles], isLoading: false }));
            await get().refreshStats();
            return { success: true, vehicle: mapped, message: data.message || 'Vehicle registered successfully.' };
        }
        catch (error) {
            set({ isLoading: false, apiError: error.message });
            return { success: false, message: error.message || 'Vehicle registration failed.' };
        }
    },
    updateVehicle: (id, data) => {
        set(state => ({
            vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...data } : v),
        }));
    },
    assignDriver: async (vehicleId, driverId) => {
        try {
            set({ isLoading: true, apiError: '' });
            const data = await api.createAssignment({ vehicle: vehicleId, driver: driverId });
            const assignment = mapAssignment(data.assignment);
            set(state => ({
                assignments: [assignment, ...state.assignments.filter(a => a.id !== assignment.id)],
                vehicles: state.vehicles.map(v => v.id === vehicleId && !v.assignedDrivers.includes(driverId)
                    ? { ...v, assignedDrivers: [...v.assignedDrivers, driverId] }
                    : v),
                isLoading: false,
            }));
            await get().refreshStats();
            return { success: true, assignment, message: data.message || 'Driver assigned successfully.' };
        }
        catch (error) {
            set({ isLoading: false, apiError: error.message });
            return { success: false, message: error.message || 'Driver assignment failed.' };
        }
    },
    removeDriver: async (vehicleId, driverId) => {
        try {
            set({ isLoading: true, apiError: '' });
            const assignment = get().assignments.find(a => a.vehicleId === vehicleId && a.driverId === driverId && a.status === 'active');
            if (assignment?.id) {
                await api.removeAssignment(assignment.id);
            }
            set(state => ({
                assignments: state.assignments.map(a => a.id === assignment?.id ? { ...a, status: 'removed' } : a),
                vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, assignedDrivers: v.assignedDrivers.filter(d => d !== driverId) } : v),
                isLoading: false,
            }));
            await get().refreshStats();
            return { success: true, message: 'Driver removed successfully.' };
        }
        catch (error) {
            set({ isLoading: false, apiError: error.message });
            return { success: false, message: error.message || 'Driver removal failed.' };
        }
    },
    suspendVehicle: async (vehicleId) => {
        set(state => ({ vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, status: 'suspended' } : v) }));
        try { await api.updateVehicleStatus(vehicleId, 'suspended'); await get().fetchDashboardData(); }
        catch (error) { set({ apiError: error.message }); }
    },
    blacklistVehicle: async (vehicleId) => {
        set(state => ({ vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, status: 'blacklisted' } : v) }));
        try { await api.updateVehicleStatus(vehicleId, 'blacklisted'); await get().fetchDashboardData(); }
        catch (error) { set({ apiError: error.message }); }
    },
    activateVehicle: async (vehicleId) => {
        set(state => ({ vehicles: state.vehicles.map(v => v.id === vehicleId ? { ...v, status: 'active' } : v) }));
        try { await api.updateVehicleStatus(vehicleId, 'active'); await get().fetchDashboardData(); }
        catch (error) { set({ apiError: error.message }); }
    },
    // -------- LICENSES --------
    addLicense: (licenseData) => {
        const newLicense = {
            ...licenseData,
            id: generateId('LIC'),
        };
        set(state => ({ licenses: [...state.licenses, newLicense] }));
    },
    updateLicense: (id, data) => {
        set(state => ({
            licenses: state.licenses.map(l => l.id === id ? { ...l, ...data } : l),
        }));
    },
    // -------- VIOLATIONS --------
    createViolation: async (violationData) => {
        try {
            set({ isLoading: true, apiError: '' });
            const violationType = VIOLATION_TYPES.find(v => v.code === violationData.violationType);
            const license = violationData.licenseId
                ? get().licenses.find(l => l.id === violationData.licenseId)
                : get().licenses.find(l => l.driverId === violationData.driverId);

            const payload = {
                vehicle: violationData.vehicleId,
                driver: violationData.driverId || undefined,
                license: license?.id || undefined,
                violationType: violationType?.label || violationData.violationLabel || violationData.description || violationData.violationType,
                violationCode: violationData.violationType,
                description: violationData.description,
                location: typeof violationData.location === 'object'
                    ? violationData.location
                    : { address: violationData.location || 'Unknown location', city: '' },
                fineAmount: Number(violationData.fineAmount) || violationType?.fine || 0,
            };

            const data = await api.createViolation(payload);
            const mapped = mapViolation(data.violation);
            set(state => ({ violations: [mapped, ...state.violations], isLoading: false }));
            await get().refreshStats();
            return mapped.caseId;
        }
        catch (error) {
            set({ isLoading: false, apiError: error.message });
            throw error;
        }
    },
    updateViolationStatus: async (id, status) => {
        const isPaymentStatus = ['paid', 'unpaid', 'waived'].includes(status);

        set(state => ({
            violations: state.violations.map(v => {
                if (v.id !== id) return v;

                return isPaymentStatus
                    ? { ...v, paymentStatus: status, updatedAt: new Date().toISOString() }
                    : { ...v, status, updatedAt: new Date().toISOString() };
            }),
        }));

        try {
            if (['approved', 'dismissed'].includes(status)) {
                await api.reviewViolation(id, {
                    status,
                    adminReviewNote: `Case ${status} from frontend.`,
                });
            }

            if (isPaymentStatus) {
                await api.updatePayment(id, status);
            }

            await get().fetchDashboardData();
        }
        catch (error) {
            set({ apiError: error.message });
            await get().fetchDashboardData();
        }
    },
    // -------- USER MANAGEMENT --------
    updateUserStatus: async (userId, status) => {
        set(state => ({
            users: state.users.map(u => u.id === userId ? { ...u, status } : u),
        }));

        try {
            await api.updateUserStatus(userId, status);
            await get().fetchDashboardData();
        }
        catch (error) {
            set({ apiError: error.message });
            await get().fetchDashboardData();
        }
    },
    deleteUser: (userId) => {
        set(state => ({
            users: state.users.filter(u => u.id !== userId),
        }));
    },
    // -------- VERIFICATION ENGINE (Backend API) --------
    verifyVehicle: async (plateNumber, driverId = '') => {
        try {
            const data = await api.verifyVehicle(plateNumber, driverId);
            const vehicle = mapVehicle(data.vehicle);
            const issues = data.verification?.issues || [];
            const authorizedDrivers = (data.authorizedDrivers || []).map(driver => {
                const mappedDriverId = normalizeId(driver);
                const license = get().licenses.find(l => l.driverId === mappedDriverId);
                return {
                    id: license?.id || mappedDriverId,
                    driverId: mappedDriverId,
                    driverName: driver.name || license?.driverName || 'Driver',
                    licenseNumber: license?.licenseNumber || '',
                    category: license?.category || '',
                    status: license?.status || driver.status || 'active',
                };
            });
            const vehicleViolations = get().violations.filter(v => v.vehicleId === vehicle.id);

            set(state => ({
                vehicles: state.vehicles.some(v => v.id === vehicle.id)
                    ? state.vehicles.map(v => v.id === vehicle.id ? { ...vehicle, assignedDrivers: authorizedDrivers.map(d => d.driverId) } : v)
                    : [{ ...vehicle, assignedDrivers: authorizedDrivers.map(d => d.driverId) }, ...state.vehicles],
            }));

            return {
                found: true,
                vehicle: { ...vehicle, assignedDrivers: authorizedDrivers.map(d => d.driverId) },
                owner: typeof data.vehicle?.owner === 'object' ? data.vehicle.owner : null,
                assignedDrivers: authorizedDrivers,
                driverAuthorization: data.driverAuthorization || null,
                issues,
                isCompliant: data.verification?.result === 'valid' && issues.length === 0,
                violationHistory: vehicleViolations,
                safetyScore: vehicle.safetyScore ?? 100,
            };
        }
        catch (error) {
            return { found: false, message: error.message || 'Vehicle not found in BRTA database.' };
        }
    },
    verifyDriver: async (licenseNumber) => {
        try {
            const data = await api.verifyLicense(licenseNumber);
            const license = mapLicense(data.license);
            const issues = data.verification?.issues || [];
            const driverId = license.driverId;
            const driverViolations = get().violations.filter(v => v.driverId === driverId);
            const authorizedVehicles = get().vehicles.filter(v => (v.assignedDrivers || []).includes(driverId));

            set(state => ({
                licenses: state.licenses.some(l => l.id === license.id)
                    ? state.licenses.map(l => l.id === license.id ? license : l)
                    : [license, ...state.licenses],
            }));

            return {
                found: true,
                license,
                driver: typeof data.license?.driver === 'object' ? data.license.driver : null,
                issues,
                isCompliant: data.verification?.result === 'valid' && issues.length === 0,
                violationHistory: driverViolations,
                authorizedVehicles,
            };
        }
        catch (error) {
            return { found: false, message: error.message || 'License not found in BRTA database.' };
        }
    },
    verifyByQR: async (qrCode) => {
        return get().verifyVehicle(qrCode);
    },
    // -------- ACTIVITY LOGS --------
    addLog: (logData) => {
        const newLog = {
            ...logData,
            id: generateId('LOG'),
            timestamp: new Date().toISOString(),
        };
        set(state => ({ activityLogs: [newLog, ...state.activityLogs] }));
    },
    // -------- UTILITIES --------
    getViolationTypes: () => VIOLATION_TYPES,
    getStats: () => {
        const state = get();
        const localStats = buildStatsFromState(state);
        return {
            ...localStats,
            ...(state.stats || {}),
            activeVehicles: state.stats?.activeVehicles ?? localStats.activeVehicles,
            suspendedVehicles: state.stats?.suspendedVehicles ?? localStats.suspendedVehicles,
            blacklistedVehicles: state.stats?.blacklistedVehicles ?? localStats.blacklistedVehicles,
            totalDrivers: state.stats?.totalDrivers ?? localStats.totalDrivers,
            totalPolice: state.stats?.totalPolice ?? localStats.totalPolice,
            validLicenses: state.stats?.validLicenses ?? localStats.validLicenses,
            expiredLicenses: state.stats?.expiredLicenses ?? localStats.expiredLicenses,
        };
    },
}));
export default useStore;
