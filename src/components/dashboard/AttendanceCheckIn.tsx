'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    CircularProgress,
    Chip,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import {
    AccessTime,
    Place,
    CheckCircle,
    Warning,
    Login,
    Logout,
    MyLocation,
    EventNote,
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import {
    employeesApi,
    projectsApi,
    attendanceApi,
    timeSchedulesApi,
    manualAttendanceRequestApi,
    laborApi,
    authApi
} from '@/lib/api';
import type { ProjectResponse } from '@/lib/api/projects';
import type { AttendanceResponse } from '@/lib/api/attendance';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import 'leaflet/dist/leaflet.css';
import { formatDate, getTodayLocalDate } from '@/lib/utils/dateFormatter';

// Helper function to format time from ISO string to HH:mm (24-hour)
const formatTimeDisplay = (timeString: string | null | undefined): string => {
    if (!timeString) return '';
    try {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
            const h = date.getHours();
            const m = date.getMinutes();
            // 24h format
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${pad(h)}:${pad(m)}`;
        }
        // Try parsing as time string directly (HH:mm:ss or HH:mm)
        const timeMatch = timeString.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
            const h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${pad(h)}:${pad(m)}`;
        }
        return timeString;
    } catch {
        return timeString || '';
    }
};

// Dynamically import Leaflet components to avoid SSR issues
// Using loading component to ensure proper initialization
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    {
        ssr: false,
        loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
    }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Circle = dynamic(
    () => import('react-leaflet').then((mod) => mod.Circle),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

interface Location {
    lat: number;
    lng: number;
}

import { useClientTime } from '@/hooks/useClientTime';
// ... other imports

export default function AttendanceCheckIn() {
    const currentTime = useClientTime();
    // const [currentTime, setCurrentTime] = useState(new Date()); // Removed
    const [userLocation, setUserLocation] = useState<Location | null>(null);
    const [project, setProject] = useState<ProjectResponse | null>(null);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceResponse | null>(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [employeeNo, setEmployeeNo] = useState<number | null>(null);
    const [projectError, setProjectError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Dynamic Schedule
    const [workStartTime, setWorkStartTime] = useState('08:00');
    const [workEndTime, setWorkEndTime] = useState('17:00');

    // Manual Request State
    const [manualDialogOpen, setManualDialogOpen] = useState(false);
    const [manualDate, setManualDate] = useState(getTodayLocalDate());
    const [manualEntryTime, setManualEntryTime] = useState('');
    const [manualExitTime, setManualExitTime] = useState('');
    const [manualReason, setManualReason] = useState('');
    const [manualErrors, setManualErrors] = useState<{ [key: string]: string }>({});

    // --- 1. Mount Check (for Leaflet SSR) ---
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fix Leaflet default marker icon 404: use absolute CDN URLs so icons work on any route (e.g. /dashboard/self-service/attendance)
    useEffect(() => {
        if (!isMounted) return;
        import('leaflet').then((L) => {
            const Default = L.Icon.Default as unknown as { prototype: { _getIconUrl?: unknown } };
            if (Default?.prototype?._getIconUrl) delete Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
        });
    }, [isMounted]);

    // Update mapReady when project coordinates are available and container exists
    useEffect(() => {
        if (isMounted && project?.projectLatitude && project?.projectLongitude) {
            // Use requestAnimationFrame to ensure DOM is ready
            const checkContainer = () => {
                if (mapContainerRef.current && mapContainerRef.current.offsetParent !== null) {
                    setMapReady(true);
                } else {
                    // Retry after a short delay
                    setTimeout(checkContainer, 50);
                }
            };
            // Small delay to ensure DOM is fully rendered
            setTimeout(checkContainer, 200);
        } else {
            setMapReady(false);
        }
    }, [isMounted, project?.projectLatitude, project?.projectLongitude]);

    // --- 2. Clock Effect - Replaced by useClientTime --- 
    // useEffect(() => {
    //     const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    //     return () => clearInterval(timer);
    // }, []);

    // --- 3. Initial Data Fetch ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingInitial(true);
                // Get Employee Info
                const employee = await employeesApi.getMyEmployee();
                setEmployeeNo(employee.employeeNo);

                // Get Project Details first (needed for schedule lookup)
                let projectCode = employee.primaryProjectCode;

                // If no primaryProjectCode, check for active labor assignments as fallback
                // Note: This endpoint may require ADMIN/HR_MANAGER role, so it might fail for regular employees
                if (!projectCode) {
                    try {
                        const assignments = await laborApi.getEmployeeAssignments(employee.employeeNo);
                        const activeAssignment = assignments.find(
                            (a: any) => {
                                const status = (a.assignmentStatus || '').toUpperCase();
                                const isActive = status === 'ACTIVE' || a.isActive === true;
                                if (isActive && a.endDate) {
                                    const endDate = new Date(a.endDate);
                                    return endDate >= new Date();
                                }
                                return isActive;
                            }
                        );
                        if (activeAssignment) {
                            projectCode = activeAssignment.projectCode;
                            console.log('Found active labor assignment, using project:', {
                                projectCode,
                                assignmentNo: activeAssignment.assignmentNo,
                                status: activeAssignment.assignmentStatus
                            });
                        }
                    } catch (assignErr) {
                        console.warn('Could not check labor assignments fallback:', assignErr);
                    }
                }

                // If still no projectCode, check the User account for an explicit project assignment
                if (!projectCode) {
                    try {
                        const currentUser = await authApi.getCurrentUser();
                        if (currentUser && currentUser.projectCode) {
                            projectCode = currentUser.projectCode;
                            console.log('Project found from user account settings:', {
                                projectCode,
                                userType: currentUser.userType
                            });
                        }
                    } catch (authErr) {
                        console.warn('Could not check user account for project assignment:', authErr);
                    }
                }

                if (projectCode) {
                    try {
                        const proj = await projectsApi.getProjectById(projectCode);
                        if (proj) {
                            const status = (proj.projectStatus || proj.status || '').toUpperCase();
                            const isProjectActive = status === 'ACTIVE' || proj.isActive === true;

                            if (isProjectActive) {
                                setProject(proj);
                                setProjectError(null);
                                console.log('Project loaded and active:', proj.projectCode);
                            } else {
                                const currentStatusAr = proj.projectStatusDisplay || status || 'غير نشط';
                                setProjectError(`المشروع المخصص لك (${proj.projectName}) غير نشط حالياً. الحالة: ${currentStatusAr}`);
                                console.warn(`Project ${projectCode} is not active. Status: ${status}`);
                            }
                        } else {
                            setProjectError(`المشروع برقم ${projectCode} غير موجود`);
                        }
                    } catch (projErr) {
                        console.error(`Failed to load project ${projectCode}:`, projErr);
                        // Log detailed error for debugging
                        if (projErr instanceof Error) {
                            const errorMsg = projErr.message.includes('تم رفض الوصول')
                                ? 'لا توجد صلاحية لعرض تفاصيل المشروع'
                                : `فشل تحميل المشروع: ${projErr.message}`;
                            setProjectError(errorMsg);
                            console.error('Project fetch error details:', {
                                message: projErr.message,
                                stack: projErr.stack,
                                employeeNo: employee.employeeNo,
                                primaryProjectCode: employee.primaryProjectCode
                            });
                        }
                        // Don't set project on error - will show "no project" message
                    }
                } else {
                    console.warn('Employee has no project assignment. Employee data:', {
                        employeeNo: employee.employeeNo,
                        employeeName: employee.employeeName,
                        primaryDeptCode: employee.primaryDeptCode,
                        primaryProjectCode: employee.primaryProjectCode
                    });
                    setProjectError(null);
                }

                // Get Schedule (after project is loaded to check for project-specific schedules)
                try {
                    const schedules = await timeSchedulesApi.getAllSchedules();
                    const empDeptCode = employee.primaryDeptCode;

                    // Priority: Project schedule > Department schedule > Default schedule
                    let schedule = null;

                    // Priority 1: Project-specific schedule
                    if (projectCode) {
                        schedule = schedules.find(s =>
                            s.projectCode === projectCode && s.isActive === 'Y'
                        );
                    }

                    // Priority 2: Department-specific schedule
                    if (!schedule && empDeptCode) {
                        schedule = schedules.find(s =>
                            s.departmentCode === empDeptCode && s.isActive === 'Y'
                        );
                    }

                    // Priority 3: Default schedule (no project or department)
                    if (!schedule) {
                        schedule = schedules.find(s =>
                            !s.departmentCode && !s.projectCode && s.isActive === 'Y'
                        );
                    }

                    if (schedule) {
                        setWorkStartTime(schedule.scheduledStartTime.substring(0, 5));
                        setWorkEndTime(schedule.scheduledEndTime.substring(0, 5));
                    }
                } catch (schedErr) {
                    console.error('Failed to load schedule:', schedErr);
                    // Fallback to defaults
                }

                // Get Today's Attendance
                const attendance = await attendanceApi.getTodayAttendance(employee.employeeNo);
                setTodayAttendance(attendance);

            } catch (err) {
                console.error('Failed to load attendance data:', err);
            } finally {
                setLoadingInitial(false);
            }
        };

        fetchData();
    }, []);

    // --- 4. Geolocation Tracking ---
    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported by your browser');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setGeoError(null);
            },
            (error) => {
                console.error('Geolocation error:', error);
                // User denied or error
                if (error.code === error.PERMISSION_DENIED) {
                    setGeoError('يرجى تفعيل خدمة الموقع (GPS) لتسجيل الحضور.');
                } else {
                    setGeoError('تعذر تحديد موقعك. يرجى التأكد من تفعيل GPS.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // --- 5. Calculations ---

    // Calculate Distance (Haversine Formula)
    const distanceToProject = useMemo(() => {
        if (!userLocation || !project || !project.projectLatitude || !project.projectLongitude) return null;

        const R = 6371e3; // meters
        const φ1 = (userLocation.lat * Math.PI) / 180;
        const φ2 = (project.projectLatitude * Math.PI) / 180;
        const Δφ = ((project.projectLatitude - userLocation.lat) * Math.PI) / 180;
        const Δλ = ((project.projectLongitude - userLocation.lng) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in meters
    }, [userLocation, project]);

    const isWithinRadius = useMemo(() => {
        if (distanceToProject === null || !project) return false;
        const radius = project.attendanceRadius || project.gpsRadiusMeters || 100;
        if (!radius) return false;
        return distanceToProject <= radius;
    }, [distanceToProject, project]);

    // Check if attendance is for today and if user has checked in
    const today = getTodayLocalDate();
    const isTodayAttendance = todayAttendance?.attendanceDate === today;
    const hasCheckedIn = isTodayAttendance && !!todayAttendance?.entryTime;

    // Check if current time is after scheduled end time
    const isAfterEndTime = useMemo(() => {
        if (hasCheckedIn) return false; // Already checked in, no need to validate

        const [endHour, endMinute] = workEndTime.split(':').map(Number);
        const [startHour, startMinute] = workStartTime.split(':').map(Number);

        if (!currentTime) return false;

        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();

        const currentTimeMinutes = currentHour * 60 + currentMinute;
        const endTimeMinutes = endHour * 60 + endMinute;
        const startTimeMinutes = startHour * 60 + startMinute;

        // Check if schedule crosses midnight (end time < start time)
        const crossesMidnight = endTimeMinutes < startTimeMinutes;

        if (crossesMidnight) {
            // For midnight-crossing schedules (e.g., 22:00 to 06:00)
            // Check-in is invalid if current time is after end time AND before start time
            // (meaning we're past the end time on the next day, e.g., 07:00 when schedule is 22:00-06:00)
            return currentTimeMinutes > endTimeMinutes && currentTimeMinutes < startTimeMinutes;
        } else {
            // For normal schedules (e.g., 08:00 to 17:00)
            // Check-in is invalid if current time is after end time
            return currentTimeMinutes > endTimeMinutes;
        }
    }, [currentTime, workEndTime, workStartTime, hasCheckedIn]);

    // Time Comparison Message
    const timeStatusMessage = useMemo(() => {
        if (!currentTime) return { text: 'جارٍ تحميل الوقت...', color: 'default', status: 'LOADING' };

        // If user has already checked in, use entry time instead of current time
        const timeToCompare = (todayAttendance?.entryTime && isTodayAttendance)
            ? new Date(todayAttendance.entryTime)
            : currentTime;

        const [startHour, startMinute] = workStartTime.split(':').map(Number);

        const startTime = new Date(currentTime);
        startTime.setHours(startHour, startMinute, 0, 0);

        // Handle shifts that start tomorrow relative to current time (e.g. 1 AM shift current time 11 PM)
        // If start time (e.g. 1 AM today) is > 12 hours ago, and we are late at night (e.g. 23:00)
        // Then the shift probably starts tomorrow at 1 AM.
        // Or if schedule implies overnight (e.g. 22:00 to 06:00), handled by normal logic.
        // But for "Next Day" starts (User case: 01:00 - 03:00, current 23:55), 
        // 01:00 today was 22 hours ago. 01:00 tomorrow is 1 hour away.

        let diffMs = timeToCompare.getTime() - startTime.getTime();

        // Heuristic: If we are "Late" by more than 12 hours, assume the shift is actually for tomorrow
        // This handles the case where it's 23:55 and shift is 01:00 AM (which is technically "tomorrow")
        if (diffMs > 12 * 60 * 60 * 1000 && !hasCheckedIn) {
            startTime.setDate(startTime.getDate() + 1);
            diffMs = timeToCompare.getTime() - startTime.getTime();
        }

        const diffMins = Math.floor(Math.abs(diffMs) / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;

        // If already checked in, show the actual delay/early status
        if (hasCheckedIn) {
            if (diffMs < 0) {
                // Checked in early
                return {
                    text: `دخل مبكراً ${diffHours > 0 ? `${diffHours} ساعة و ` : ''}${remainingMins} دقيقة`,
                    color: 'success',
                    status: 'EARLY'
                };
            } else if (diffMs === 0 || diffMins <= 15) {
                // On time or within grace period (15 minutes)
                return {
                    text: 'دخل في الوقت المحدد',
                    color: 'success',
                    status: 'ON_TIME'
                };
            } else {
                // Checked in late
                return {
                    text: `دخل متأخراً ${diffHours > 0 ? `${diffHours} ساعة و ` : ''}${remainingMins} دقيقة`,
                    color: 'error',
                    status: 'LATE'
                };
            }
        } else {
            // Not checked in yet - show time until/after scheduled start
            if (diffMs < 0) {
                // Before start time
                return {
                    text: `متبقي ${diffHours > 0 ? `${diffHours} ساعة و ` : ''}${remainingMins} دقيقة`,
                    color: 'primary',
                    status: 'EARLY'
                };
            } else {
                // After start time
                return {
                    text: `متأخر ${diffHours > 0 ? `${diffHours} ساعة و ` : ''}${remainingMins} دقيقة`,
                    color: 'error',
                    status: 'LATE'
                };
            }
        }
    }, [currentTime, workStartTime, todayAttendance, isTodayAttendance, hasCheckedIn]);

    // --- 6. Actions ---
    const { execute: handleCheckIn, loading: checkingIn } = useApiWithToast(
        async () => {
            if (!userLocation || !project || !employeeNo) return;
            // Send absolute UTC time to backend
            const checkInTime = new Date().toISOString();
            await attendanceApi.checkIn({
                projectCode: project.projectCode,
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                checkInTime: checkInTime,
            });
            // Refresh attendance status
            const attendance = await attendanceApi.getTodayAttendance(employeeNo);
            setTodayAttendance(attendance);
        },
        { successMessage: 'تم تسجيل الدخول بنجاح' }
    );

    const { execute: handleCheckOut, loading: checkingOut } = useApiWithToast(
        async () => {
            if (!userLocation || !employeeNo) return;
            // Send absolute UTC time to backend
            const checkOutTime = new Date().toISOString();
            await attendanceApi.checkOut({
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                checkOutTime: checkOutTime,
            });
            // Refresh attendance status
            const attendance = await attendanceApi.getTodayAttendance(employeeNo);
            setTodayAttendance(attendance);
        },
        { successMessage: 'تم تسجيل الانصراف بنجاح' }
    );

    const { execute: executeManualRequest, loading: submittingManual } = useApiWithToast(
        async (data: { employeeNo: number, attendanceDate: string, entryTime: string, exitTime: string, reason: string }) => {
            await manualAttendanceRequestApi.submitManualAttendanceRequest(data);

            setManualDialogOpen(false);
            setManualReason('');
            setManualEntryTime('');
            setManualExitTime('');
            setManualDate(getTodayLocalDate());
            setManualErrors({});
        },
        { successMessage: 'تم إرسال طلب الحضور اليدوي' }
    );

    const submitManualRequest = async () => {
        if (!employeeNo) return;

        const newErrors: { [key: string]: string } = {};

        if (!manualReason) {
            newErrors.reason = 'سبب الطلب مطلوب';
        }
        if (!manualEntryTime) {
            newErrors.entryTime = 'وقت الدخول مطلوب';
        }

        // Determine effective exit time: use provided value or default to work end time
        const effectiveExitTimeStr = manualExitTime;

        // Validate exit time is after entry time if provided
        if (effectiveExitTimeStr && effectiveExitTimeStr <= manualEntryTime) {
            newErrors.exitTime = 'وقت الانصراف يجب أن يكون بعد وقت الدخول';
        }

        // Check if manualDate is in the future
        const today = getTodayLocalDate();
        if (manualDate > today) {
            newErrors.date = 'لا يمكن تقديم طلب لتاريخ مستقبلي';
        }

        if (Object.keys(newErrors).length > 0) {
            setManualErrors(newErrors);
            return;
        }

        // Clear errors before submitting
        setManualErrors({});

        // Combine date and time to ISO LocalDateTime
        const entryDateTime = `${manualDate}T${manualEntryTime}:00`;
        const exitDateTime = effectiveExitTimeStr ? `${manualDate}T${effectiveExitTimeStr}:00` : '';

        await executeManualRequest({
            employeeNo,
            attendanceDate: manualDate,
            entryTime: entryDateTime,
            exitTime: exitDateTime,
            reason: manualReason,
        });
    };

    // --- Render ---

    if (loadingInitial) {
        return (
            <Paper sx={{ p: 3, height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                <CircularProgress />
            </Paper>
        );
    }

    if (!project) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
                <Typography variant="body1" sx={{ color: '#4B5563', fontWeight: 600 }}>
                    نظام تسجيل الحضور متاح حالياً للموظفين المكلفين بمشاريع عمل نشطة فقط.
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7280', mt: 1 }}>
                    سيتم تفعيل المزايا التفاعلية تلقائياً بمجرد إدراجك ضمن طاقم عمل أحد المشاريع.
                </Typography>
                {projectError && (
                    <Alert severity="warning" sx={{ mt: 2, textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ color: '#DC2626', fontWeight: 500 }}>
                            {projectError}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6B7280', mt: 0.5, display: 'block' }}>
                            يرجى التواصل مع مدير الموارد البشرية أو مدير المشروع
                        </Typography>
                    </Alert>
                )}
            </Paper>
        );
    }

    // Check if user has checked out
    const hasCheckedOut = isTodayAttendance && !!todayAttendance?.exitTime;

    return (
        <Paper sx={{ p: 3, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            {/* Header & Clock */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime sx={{ color: '#0c2b7a' }} />
                        تسجيل الحضور اليومي
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '...'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mt: 0.5 }}>
                        دوام: {workStartTime} - {workEndTime}
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0c2b7a', fontFamily: 'monospace', direction: 'ltr' }}>
                        {currentTime ? (() => {
                            const h = currentTime.getHours();
                            const m = currentTime.getMinutes();
                            const s = currentTime.getSeconds();
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            return `${pad(h)}:${pad(m)}:${pad(s)}`;
                        })() : '--:--:--'}
                    </Typography>
                    <Chip
                        label={timeStatusMessage.text}
                        color={timeStatusMessage.color as 'primary' | 'error' | 'success' | 'warning' | 'default'}
                        size="small"
                        sx={{ mt: 0.5, fontWeight: 600 }}
                    />
                </Box>
            </Box>

            {/* Map Section */}
            <Box
                ref={mapContainerRef}
                sx={{ height: 300, width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative', mb: 3, border: '1px solid #E5E7EB' }}
            >
                {!userLocation && !geoError && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', zIndex: 1000 }}>
                        <CircularProgress size={24} sx={{ mr: 1 }} /> جاري تحديد الموقع...
                    </Box>
                )}
                {geoError && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FEE2E2', zIndex: 1000, flexDirection: 'column', p: 2, textAlign: 'center' }}>
                        <Warning color="error" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography color="error" fontWeight="600">{geoError}</Typography>
                    </Box>
                )}

                {/* Only render map if mounted, container exists, project location exists, and coordinates are valid */}
                {isMounted && mapReady && project?.projectLatitude && project?.projectLongitude ? (
                    <MapContainer
                        key={`map-${project.projectCode}-${project.projectLatitude}-${project.projectLongitude}`}
                        center={[Number(project.projectLatitude), Number(project.projectLongitude)]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        dragging={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Project Location & Radius */}
                        <Circle
                            center={[Number(project.projectLatitude), Number(project.projectLongitude)]}
                            pathOptions={{ fillColor: '#0c2b7a', color: '#0c2b7a', fillOpacity: 0.1 }}
                            radius={project.attendanceRadius || project.gpsRadiusMeters || 100}
                        >
                            <Popup>موقع المشروع: {project.projectName}</Popup>
                        </Circle>
                        <Marker position={[Number(project.projectLatitude), Number(project.projectLongitude)]}>
                            <Popup>مركز المشروع</Popup>
                        </Marker>

                        {/* User Location */}
                        {userLocation && (
                            <Marker position={[userLocation.lat, userLocation.lng]}>
                                <Popup>موقعك الحالي</Popup>
                            </Marker>
                        )}
                    </MapContainer>
                ) : (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F3F4F6' }}>
                        {!isMounted || !mapReady ? (
                            <CircularProgress size={24} sx={{ mr: 1 }} />
                        ) : (
                            <Typography color="text.secondary">إحداثيات المشروع غير متوفرة</Typography>
                        )}
                    </Box>
                )}

                {/* Status Overlay */}
                <Box sx={{ position: 'absolute', bottom: 16, right: 16, left: 16, bgcolor: 'rgba(255,255,255,0.95)', p: 1.5, borderRadius: '8px', zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Place fontSize="small" color={isWithinRadius ? 'success' : 'error'} />
                        <Typography variant="body2" fontWeight="600" color={isWithinRadius ? 'success.main' : 'error.main'}>
                            {distanceToProject !== null ? `${Math.round(distanceToProject)}م من الموقع` : 'جارٍ الحساب...'}
                        </Typography>
                    </Box>
                    <Chip
                        label={isWithinRadius ? 'داخل النطاق' : 'خارج النطاق'}
                        color={isWithinRadius ? 'success' : 'error'}
                        size="small"
                    />
                </Box>
            </Box>

            {/* Alert for past end time */}
            {isAfterEndTime && !hasCheckedIn && (
                <Alert severity="error" sx={{ mb: 2, textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        لا يمكن تسجيل الدخول بعد انتهاء وقت العمل المقرر ({workEndTime})
                    </Typography>
                </Alert>
            )}

            {/* Check-In/Out Buttons */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Button
                    variant="contained"
                    size="large"
                    color="success"
                    startIcon={<Login />}
                    onClick={handleCheckIn}
                    disabled={checkingIn || hasCheckedIn || !isWithinRadius || !!geoError || loadingInitial || isAfterEndTime}
                    sx={{ py: 1.5, fontWeight: 700 }}
                >
                    {checkingIn ? 'جارٍ العمل...' : hasCheckedIn ? 'تم تسجيل الدخول' : isAfterEndTime ? `انتهى وقت العمل (${workEndTime})` : 'تسجيل دخول'}
                </Button>

                <Button
                    variant="contained"
                    size="large"
                    color="error"
                    startIcon={<Logout />}
                    onClick={handleCheckOut}
                    disabled={checkingOut || !hasCheckedIn || hasCheckedOut || !isWithinRadius || !!geoError || loadingInitial}
                    sx={{ py: 1.5, fontWeight: 700 }}
                >
                    {checkingOut ? 'جارٍ العمل...' : hasCheckedOut ? 'تم تسجيل الانصراف' : 'تسجيل انصراف'}
                </Button>
            </Box>

            {/* Manual Request Button */}
            <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<EventNote />}
                onClick={() => setManualDialogOpen(true)}
                disabled={loadingInitial}
            >
                تقديم طلب حضور يدوي (في حالة وجود مشكلة)
            </Button>

            {/* Holiday/Weekend Alerts */}
            {todayAttendance?.isHolidayWork === 'Y' && (
                <Alert severity="warning" icon={<EventNote fontSize="inherit" />} sx={{ mt: 2 }}>
                    أنت تعمل في يوم عطلة رسمية (يحتسب إضافي).
                </Alert>
            )}
            {todayAttendance?.isWeekendWork === 'Y' && (
                <Alert severity="warning" icon={<EventNote fontSize="inherit" />} sx={{ mt: 2 }}>
                    أنت تعمل في عطلة نهاية الأسبوع (يحتسب إضافي).
                </Alert>
            )}

            {/* Status Alert */}
            {hasCheckedIn && !hasCheckedOut && (
                <Alert severity="success" icon={<CheckCircle fontSize="inherit" />} sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        تم تسجيل الدخول بنجاح
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <strong>وقت الدخول:</strong> {formatTimeDisplay(todayAttendance?.entryTime)}
                    </Typography>
                </Alert>
            )}
            {hasCheckedOut && isTodayAttendance && (
                <Alert
                    severity="success"
                    icon={<CheckCircle fontSize="inherit" />}
                    sx={{ mt: 2 }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        تم إتمام يوم العمل بنجاح
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                        {todayAttendance?.entryTime && (
                            <Typography variant="body2" color="text.secondary">
                                <strong>وقت الدخول:</strong> {formatTimeDisplay(todayAttendance.entryTime)}
                            </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                            <strong>وقت الانصراف:</strong> {formatTimeDisplay(todayAttendance?.exitTime)}
                        </Typography>
                    </Box>
                </Alert>
            )}

            {/* Manual Attendance Request Dialog */}
            <Dialog open={manualDialogOpen} onClose={() => setManualDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>طلب حضور يدوي</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        استخدم هذا النموذج في حالة عدم التمكن من تسجيل الحضور عبر الموقع الجغرافي.
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, mt: 1 }}>
                        <Box sx={{ gridColumn: 'span 12' }}>
                            <TextField
                                type="date"
                                label="تاريخ الحضور"
                                value={manualDate}
                                onChange={(e) => setManualDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                error={!!manualErrors.date}
                                helperText={manualErrors.date}
                            />
                        </Box>
                        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                            <TextField
                                type="time"
                                label="وقت الدخول"
                                value={manualEntryTime}
                                onChange={(e) => setManualEntryTime(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                error={!!manualErrors.entryTime}
                                helperText={manualErrors.entryTime}
                                required
                            />
                        </Box>
                        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                            <TextField
                                type="time"
                                label="وقت الخروج (اختياري)"
                                value={manualExitTime}
                                onChange={(e) => setManualExitTime(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                error={!!manualErrors.exitTime}
                                helperText={manualErrors.exitTime}
                            />
                        </Box>
                        <Box sx={{ gridColumn: 'span 12' }}>
                            <TextField
                                label="سبب الطلب"
                                multiline
                                rows={3}
                                value={manualReason}
                                onChange={(e) => setManualReason(e.target.value)}
                                fullWidth
                                required
                                error={!!manualErrors.reason}
                                helperText={manualErrors.reason || 'مثال: نسيان الجوال، عطل في GPS، عمل خارج الموقع'}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setManualDialogOpen(false)}>إلغاء</Button>
                    <Button
                        onClick={submitManualRequest}
                        variant="contained"
                        disabled={submittingManual}
                    >
                        {submittingManual ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
