'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import Image from 'next/image';
import { getUserRole, filterMenuItems, MENU_LABEL_ROUTE_MAP, ROLE_ARABIC_NAMES, canAccessRoute } from '@/lib/permissions';
import { dashboardApi, approvalsApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { getUserContext } from '@/lib/dataFilters';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  Schedule,
  RequestPage,
  MonetizationOn,
  AccountBalance,
  Engineering,
  Warehouse,
  Inventory,
  Assignment,
  CheckCircle,
  Assessment,
  Settings,
  CalendarMonth,
  AccessTime,
  Security,
  Business,
  EventNote,
  TrendingUp,
  Description,
  ReceiptLong,
  WorkOutline,
  PersonAdd,
  AttachMoney,
  LocalShipping,
  ShoppingCart,
  CompareArrows,
  Groups,
  Storage,
  Logout,
  HelpOutline,
  KeyboardArrowDown,
  KeyboardDoubleArrowLeft,
  Category,
  RemoveCircle,
  Payment,
  Paid,
  KeyboardDoubleArrowRight,
  TransferWithinAStation,
  PlaylistAddCheck,
  History,
  Summarize,
  DocumentScanner,
  AccountCircle,
  AccountTree,
  Lock,
  SupervisorAccount,
  Notifications,
  AdminPanelSettings,
  BusinessCenter,
  Percent,
  ListAlt,
} from '@mui/icons-material';

// Base menu items - will be filtered by role
const BASE_MENU_ITEMS: MenuItem[] = [
  { label: 'لوحة التحكم', icon: <DashboardIcon />, section: 'Menu' },
  {
    label: 'إدارة الموظفين',
    icon: <People />,
    section: 'Menu',
    hasSubmenu: true,
    submenu: [
      { label: 'قائمة الموظفين', icon: <Groups /> },
      { label: 'الحضور', icon: <Schedule /> },
      { label: 'طلبات الإجازة', icon: <EventNote /> },
      { label: 'طلبات القرض', icon: <AttachMoney /> },
      { label: 'طلبات البدل', icon: <MonetizationOn /> },
      { label: 'تأجيل الأقساط', icon: <AccessTime /> },
      { label: 'أقساط القرض', icon: <ReceiptLong /> },
      { label: 'رصيد الإجازات', icon: <EventNote /> },
      { label: 'الحضور اليدوي', icon: <Schedule /> },
      { label: 'إغلاق الحضور', icon: <Lock /> },
    ]
  },
  {
    label: 'إدارة كشوف الرواتب',
    icon: <AccountBalance />,
    section: 'Menu',
    hasSubmenu: true,
    submenu: [
      { label: 'حساب الراتب', icon: <ReceiptLong /> },
      { label: 'اعتماد كشف الرواتب', icon: <CheckCircle /> },
      { label: 'التقارير الشهرية', icon: <Summarize /> },
      { label: 'سجلات الحضور', icon: <Schedule /> },
      { label: 'البدلات الشهرية', icon: <AttachMoney /> },
      { label: 'الخصومات الشهرية', icon: <RemoveCircle /> },
    ]
  },
  {
    label: 'إدارة المشاريع',
    icon: <Engineering />,
    section: 'Menu',
    hasSubmenu: true,
    submenu: [
      { label: 'قائمة المشاريع', icon: <Business /> },
      { label: 'جدول المدفوعات', icon: <Paid /> },
      { label: 'طلبات الدفع', icon: <RequestPage /> },
      { label: 'عملية الدفع', icon: <Payment /> },
      { label: 'المستحقات', icon: <Paid /> },
      { label: 'طلبات النقل', icon: <TransferWithinAStation /> },
      { label: 'تعيينات العمالة', icon: <WorkOutline /> },
    ]
  },
  {
    label: 'العمالة المؤقتة',
    icon: <PersonAdd />,
    section: 'Menu',
    hasSubmenu: true,
    submenu: [
      { label: 'طلبات العمالة المؤقتة', icon: <Assignment /> },
      { label: 'تعيينات العمال', icon: <PlaylistAddCheck /> },
      { label: 'تقارير التوفر', icon: <TrendingUp /> },
    ]
  },
  {
    label: 'المستودعات والمخزون',
    icon: <Warehouse />,
    section: 'Menu',
    hasSubmenu: true,
    submenu: [
      { label: 'إدارة الأصناف', icon: <Inventory /> },
      { label: 'فئات الأصناف', icon: <Category /> },
      { label: 'إدارة المستودعات', icon: <Warehouse /> },
      { label: 'أوامر الشراء', icon: <ShoppingCart /> },
      { label: 'الاستلام', icon: <LocalShipping /> },
      { label: 'الإصدار', icon: <Storage /> },
      { label: 'التحويلات', icon: <CompareArrows /> },
      { label: 'تقارير الرصيد', icon: <Assessment /> },
    ]
  },
  { label: 'مركز الإشعارات', icon: <Notifications />, section: 'Menu' },
];

const BASE_SETTINGS_ITEMS: MenuItem[] = [
  {
    label: 'الإعدادات',
    icon: <Settings />,
    section: 'Settings',
    hasSubmenu: true,
    submenu: [
      { label: 'إدارة المسؤولين', icon: <AdminPanelSettings /> },
      { label: 'حسابات المستخدمين', icon: <People /> },
      { label: 'الأقسام', icon: <BusinessCenter /> },
      { label: 'التخصصات', icon: <WorkOutline /> },
      { label: 'تقويم العطلات', icon: <CalendarMonth /> },
      { label: 'جداول الوقت', icon: <AccessTime /> },
      { label: 'الموردون', icon: <LocalShipping /> },
      { label: 'أنواع المعاملات', icon: <ListAlt /> },
      { label: 'سجلات النظام', icon: <History /> },
      { label: 'بدلات الموظفين', icon: <MonetizationOn /> },
      { label: 'نسب البدلات', icon: <Percent /> },
      { label: 'إعادة تعيين كلمة المرور', icon: <Lock /> },
      { label: 'الإشعارات', icon: <Notifications /> },
    ]
  },
];

// Self Service menu items - only for Employee role
const BASE_SELF_SERVICE_ITEMS: MenuItem[] = [
  {
    label: 'الخدمة الذاتية',
    icon: <AccountCircle />,
    section: 'Self Service',
    hasSubmenu: true,
    submenu: [
      { label: 'تسجيل الدخول والانصراف', icon: <Schedule /> },
      { label: 'سجل الحضور', icon: <History /> },
      { label: 'ملفي الشخصي', icon: <AccountCircle /> },
      { label: 'طلب إجازة', icon: <EventNote /> },
      { label: 'طلب قرض', icon: <AttachMoney /> },
      { label: 'طلب بدل', icon: <MonetizationOn /> },
      { label: 'تأجيل قسط', icon: <AccessTime /> },
      { label: 'عرض كشف الراتب', icon: <ReceiptLong /> },
    ]
  },
];

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  section?: string;
  badge?: number;
  hasSubmenu?: boolean;
  submenu?: { label: string; icon: React.ReactNode }[];
}

interface DashboardSidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onLogout: () => void;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
}

export default function DashboardSidebar({
  activeMenu,
  setActiveMenu,
  onLogout,
  sidebarExpanded,
  onToggleSidebar,
}: DashboardSidebarProps) {
  const router = useSafeRouter();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  // Defer to client after mount to avoid hydration mismatch (server has no sessionStorage)
  const [userRole, setUserRole] = useState<ReturnType<typeof getUserRole>>(null);
  const [userName, setUserName] = useState('مستخدم');
  const [userContext, setUserContext] = useState<ReturnType<typeof getUserContext>>({});
  useEffect(() => {
    setUserRole(getUserRole());
    setUserName(sessionStorage.getItem('userName') || 'مستخدم');
    setUserContext(getUserContext());
  }, []);

  // Track if we've failed with a connection error to prevent infinite retries
  const hasConnectionError = useRef(false);
  const lastPathname = useRef<string | null>(null);

  // Fetch pending approvals count from backend
  // Try dashboard stats first (more efficient), fallback to approvals API if needed
  const { data: dashboardStats, loading: loadingStats, error: statsError, execute: loadDashboardStats } = useApi(
    () => dashboardApi.getDashboardStats(),
    {
      immediate: true,
      onError: (error) => {
        // Track connection errors to prevent infinite retries
        if (error && (error.includes('Failed to fetch') || error.includes('ERR_CONNECTION_REFUSED') || error.includes('Failed to connect'))) {
          hasConnectionError.current = true;
        }
      },
      onSuccess: () => {
        // Reset connection error flag on success
        hasConnectionError.current = false;
      }
    }
  );

  // Fallback: Fetch pending approvals directly if dashboard stats fails or user doesn't have access
  const shouldUseFallback = statsError || (!dashboardStats && !loadingStats);
  const { data: pendingApprovals, execute: loadPendingApprovals } = useApi(
    () => {
      // Only fetch pending approvals if user has access to the approvals page
      if (userContext.employeeId && canAccessRoute(userRole, '/dashboard/approvals/pending')) {
        return approvalsApi.getAllPendingApprovals(userContext.employeeId);
      }
      return Promise.resolve([]);
    },
    { immediate: false }
  );

  // Trigger fallback fetch when needed (but not if we have a connection error)
  useEffect(() => {
    if (shouldUseFallback && userContext.employeeId && !pendingApprovals && !hasConnectionError.current) {
      loadPendingApprovals();
    }
  }, [shouldUseFallback, userContext.employeeId, pendingApprovals, loadPendingApprovals]);

  // Refresh pending approvals count when user navigates away from approval pages
  // This ensures the badge updates after approving/rejecting requests
  useEffect(() => {
    // Only refresh if:
    // 1. Pathname has actually changed (not just re-render)
    // 2. We're not on an approval page
    // 3. We're not currently loading
    // 4. We don't have a connection error (prevent infinite retries)
    // 5. Pathname is valid
    const pathnameChanged = pathname && pathname !== lastPathname.current;

    if (
      pathnameChanged &&
      pathname &&
      !pathname.startsWith('/dashboard/approvals') &&
      !loadingStats &&
      !hasConnectionError.current
    ) {
      lastPathname.current = pathname;
      // Refresh dashboard stats to get updated count
      loadDashboardStats();
    } else if (pathname && !lastPathname.current) {
      // Initialize lastPathname on first render
      lastPathname.current = pathname;
    }
  }, [pathname, loadingStats, loadDashboardStats]);

  // Get pending approvals count - prefer dashboard stats, fallback to direct API count
  const pendingApprovalsCount = dashboardStats?.pendingApprovals ?? (pendingApprovals?.length || 0);

  const toggleMenuExpand = (menuLabel: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuLabel]: !prev[menuLabel]
    }));
  };

  // Map menu labels to routes using centralized mapping
  const getRouteFromLabel = (label: string): string => {
    return MENU_LABEL_ROUTE_MAP[label] || '/dashboard';
  };

  const handleMenuClick = (label: string, hasSubmenu: boolean) => {
    if (hasSubmenu) {
      toggleMenuExpand(label);
    } else {
      setActiveMenu(label);
      const route = getRouteFromLabel(label);
      router.push(route);
    }
  };



  // Base channel items - will be filtered by role
  const baseChannelItems: MenuItem[] = useMemo(() => [
    {
      label: 'الموافقات',
      icon: <CheckCircle />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      hasSubmenu: true,
      submenu: [
        { label: 'الموافقات المعلقة', icon: <PlaylistAddCheck /> },
        { label: 'سجل الموافقات', icon: <History /> },
      ]
    },
    {
      label: 'التقارير',
      icon: <Assessment />,
      hasSubmenu: true,
      submenu: [
        { label: 'تقارير الحضور', icon: <Schedule /> },
        { label: 'المستندات المنتهية', icon: <DocumentScanner /> },
        { label: 'تقارير المشاريع', icon: <Business /> },
        { label: 'مدفوعات المشاريع', icon: <Payment /> },
        { label: 'تقرير أقساط القرض', icon: <ReceiptLong /> },
        { label: 'إجازات الموظفين', icon: <EventNote /> },
        { label: 'تقارير المخزون', icon: <Storage /> },
        { label: 'استخدام النظام', icon: <TrendingUp /> },
      ]
    },
  ], [pendingApprovalsCount]);





  // Filter menu items based on role
  const menuItems = useMemo(() => {
    let items = filterMenuItems(userRole, BASE_MENU_ITEMS);

    if (userRole === 'Employee') {
      // For Employees, remove the default Dashboard link as it will be replaced by Self Service
      items = items.filter(item => item.label !== 'لوحة التحكم');
    } else {
      // For Managers/Admins, merge Self Service items into the main menu
      // This puts them in a "parent" structure alongside other main modules
      const selfService = filterMenuItems(userRole, BASE_SELF_SERVICE_ITEMS);
      items = [...items, ...selfService];
    }
    return items;
  }, [userRole]);

  const channelItems = useMemo(() => filterMenuItems(userRole, baseChannelItems), [userRole, baseChannelItems]);
  const settingsItems = useMemo(() => filterMenuItems(userRole, BASE_SETTINGS_ITEMS), [userRole]);

  // Self Service items
  const selfServiceItems: MenuItem[] = useMemo(() => {
    if (userRole === 'Employee') {
      // Filter the base items first using the shared permission logic
      const filteredSelfService = filterMenuItems(userRole, BASE_SELF_SERVICE_ITEMS);

      if (filteredSelfService.length > 0) {
        const selfServiceParent = filteredSelfService[0];
        // Now selfServiceParent.submenu is already filtered by filterMenuItems
        if (selfServiceParent && selfServiceParent.submenu) {
          return selfServiceParent.submenu.map(item => ({
            label: item.label,
            icon: item.icon,
            section: 'Self Service',
            hasSubmenu: false
          }));
        }
      }
      return [];
    }

    // For Managers/Admins, return empty as these are merged into menuItems
    return [];
  }, [userRole]);

  // Initialize expanded menus and active menu based on current route
  useEffect(() => {
    if (!pathname) return;

    const allMenuItems = [...menuItems, ...channelItems, ...settingsItems, ...selfServiceItems];

    // Find which menu item matches the current route
    for (const menuItem of allMenuItems) {
      // Check if this is a direct menu item (no submenu)
      if (!menuItem.hasSubmenu) {
        const route = getRouteFromLabel(menuItem.label);
        if (route === pathname) {
          setActiveMenu(menuItem.label);
          return;
        }
      } else if (menuItem.submenu) {
        // Check if any submenu item matches the current route
        const activeSubmenu = menuItem.submenu.find(subItem => {
          const route = getRouteFromLabel(subItem.label);
          return route === pathname;
        });

        if (activeSubmenu) {
          // Expand the parent menu and set active menu to the submenu item
          setTimeout(() => {
            setExpandedMenus(prev => ({
              ...prev,
              [menuItem.label]: true
            }));
          }, 0);
          setActiveMenu(activeSubmenu.label);
          return;
        }
      }
    }

  }, [pathname, menuItems, channelItems, settingsItems, selfServiceItems, setActiveMenu]);

  const renderMenuItem = (item: MenuItem, index: number, baseDelay: number) => (
    <Box key={item.label}>
      <Tooltip
        title={!sidebarExpanded ? item.label : ''}
        placement="right"
        arrow
      >
        <Box
          onClick={() => handleMenuClick(item.label, item.hasSubmenu || false)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarExpanded ? 'space-between' : 'center',
            padding: '10px 12px',
            borderRadius: '8px',
            mb: 0.5,
            cursor: 'pointer',
            backgroundColor: activeMenu === item.label ? '#F3F4F6' : 'transparent',
            '&:hover': {
              backgroundColor: '#F9FAFB',
            },
            transition: 'all 0.2s ease',
            position: 'relative',
            animation: `fadeInRight 0.5s ease-out ${baseDelay + index * 0.1}s both`,
            '@keyframes fadeInRight': {
              from: {
                opacity: 0,
                transform: 'translateX(10px)',
              },
              to: {
                opacity: 1,
                transform: 'translateX(0)',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              color: activeMenu === item.label ? '#0c2b7a' : '#6B7280',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {item.icon}
            </Box>
            {sidebarExpanded && (
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: activeMenu === item.label ? 600 : 500,
                  color: activeMenu === item.label ? '#111827' : '#4B5563',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </Typography>
            )}
          </Box>
          {sidebarExpanded && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {item.badge && (
                <Box
                  sx={{
                    backgroundColor: '#0c2b7a',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {item.badge}
                </Box>
              )}
              {item.hasSubmenu && (
                <Box sx={{
                  color: '#9CA3AF',
                  display: 'flex',
                  transition: 'transform 0.2s ease',
                  transform: expandedMenus[item.label] ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  <KeyboardArrowDown sx={{ fontSize: '18px' }} />
                </Box>
              )}
            </Box>
          )}
          {!sidebarExpanded && item.badge && (
            <Box
              sx={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                backgroundColor: '#0c2b7a',
                color: '#FFFFFF',
                borderRadius: '50%',
                fontSize: '9px',
                fontWeight: 600,
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.badge}
            </Box>
          )}
        </Box>
      </Tooltip>

      {/* Submenu Items */}
      {item.hasSubmenu && item.submenu && sidebarExpanded && expandedMenus[item.label] && (
        <Box
          sx={{
            overflow: 'hidden',
            animation: 'slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            '@keyframes slideDown': {
              from: {
                opacity: 0,
                maxHeight: 0,
                transform: 'translateY(-10px)',
              },
              to: {
                opacity: 1,
                maxHeight: '500px',
                transform: 'translateY(0)',
              },
            },
          }}
        >
          {item.submenu.map((subItem, subIndex) => (
            <Tooltip
              key={subItem.label}
              title={''}
              placement="right"
              arrow
            >
              <Box
                onClick={() => handleMenuClick(subItem.label, false)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  padding: '8px 44px 8px 12px',
                  borderRadius: '8px',
                  mb: 0.5,
                  cursor: 'pointer',
                  backgroundColor: activeMenu === subItem.label ? '#EEF2FF' : 'transparent',
                  '&:hover': {
                    backgroundColor: '#F9FAFB',
                  },
                  transition: 'all 0.2s ease',
                  animation: `fadeInRight 0.4s ease-out ${0.1 + subIndex * 0.08}s both`,
                  '@keyframes fadeInRight': {
                    from: {
                      opacity: 0,
                      transform: 'translateX(15px)',
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateX(0)',
                    },
                  },
                }}
              >
                <Box sx={{
                  color: activeMenu === subItem.label ? '#0c2b7a' : '#9CA3AF',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {subItem.icon}
                </Box>
                <Typography
                  sx={{
                    fontSize: '13px',
                    fontWeight: activeMenu === subItem.label ? 600 : 500,
                    color: activeMenu === subItem.label ? '#0c2b7a' : '#6B7280',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {subItem.label}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        width: sidebarExpanded ? '280px' : '80px',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        right: 0,
        top: 0,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowX: 'hidden',
        overflowY: 'hidden',
        animation: 'slideInRight 0.5s ease-out',
        '@keyframes slideInRight': {
          from: {
            opacity: 0,
            transform: 'translateX(20px)',
          },
          to: {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
      }}
    >
      {/* Logo Section with Toggle */}
      <Box sx={{
        padding: '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        minHeight: '80px',
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flex: 1,
          justifyContent: sidebarExpanded ? 'flex-start' : 'center',
        }}>
          <Box sx={{ width: '40px', height: '40px', position: 'relative', flexShrink: 0 }}>
            <Image
              src="/assets/logo.png"
              alt="شعار شركة تكنو"
              width={40}
              height={40}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              priority
            />
          </Box>
          {sidebarExpanded && (
            <Typography
              sx={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              شركة تكنو
            </Typography>
          )}
        </Box>

        {/* Toggle Button - Collapse */}
        {sidebarExpanded && (
          <Box sx={{ flexShrink: 0 }}>
            <IconButton
              onClick={onToggleSidebar}
              sx={{
                color: '#6B7280',
                padding: '8px',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#F3F4F6',
                  color: '#0c2b7a',
                },
                transition: 'all 0.2s ease',
              }}
              title="طي القائمة"
            >
              <KeyboardDoubleArrowLeft sx={{ fontSize: '20px' }} />
            </IconButton>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: '#E5E7EB' }} />

      {/* Expand Button (when collapsed) */}
      {!sidebarExpanded && (
        <Box sx={{ padding: '12px 16px', display: 'flex', justifyContent: 'center' }}>
          <IconButton
            onClick={onToggleSidebar}
            sx={{
              color: '#6B7280',
              padding: '8px',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: '#F3F4F6',
                color: '#0c2b7a',
              },
              transition: 'all 0.2s ease',
            }}
            title="توسيع القائمة"
          >
            <KeyboardDoubleArrowRight sx={{ fontSize: '24px' }} />
          </IconButton>
        </Box>
      )}

      {!sidebarExpanded && <Divider sx={{ borderColor: '#E5E7EB' }} />}

      {/* Menu Section */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#E5E7EB',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#D1D5DB',
        },
      }}>
        {/* Menu Items */}
        {menuItems.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {sidebarExpanded && (
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 1.5,
                  px: 1,
                  animation: 'fadeIn 0.5s ease-out 0.2s both',
                  '@keyframes fadeIn': {
                    from: {
                      opacity: 0,
                    },
                    to: {
                      opacity: 1,
                    },
                  },
                }}
              >
                القائمة
              </Typography>
            )}
            {menuItems.map((item, index) => renderMenuItem(item, index, 0.3))}
          </Box>
        )}

        {/* Self Service Section - Only for Employee role */}
        {userRole === 'Employee' && selfServiceItems.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {sidebarExpanded && (
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 1.5,
                  px: 1,
                  animation: 'fadeIn 0.5s ease-out 0.6s both',
                  '@keyframes fadeIn': {
                    from: {
                      opacity: 0,
                    },
                    to: {
                      opacity: 1,
                    },
                  },
                }}
              >
                الخدمة الذاتية
              </Typography>
            )}
            {selfServiceItems.map((item, index) => renderMenuItem(item, index, 0.7))}
          </Box>
        )}

        {/* Channel Section - Only show if there are items */}
        {channelItems.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {sidebarExpanded && (
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 1.5,
                  px: 1,
                  animation: 'fadeIn 0.5s ease-out 0.9s both',
                  '@keyframes fadeIn': {
                    from: {
                      opacity: 0,
                    },
                    to: {
                      opacity: 1,
                    },
                  },
                }}
              >
                القنوات
              </Typography>
            )}
            {channelItems.map((item, index) => renderMenuItem(item, index, 1.0))}
          </Box>
        )}

        {/* Settings Section - Only show if there are items */}
        {settingsItems.length > 0 && (
          <Box>
            {sidebarExpanded && (
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mb: 1.5,
                  px: 1,
                  animation: 'fadeIn 0.5s ease-out 1.3s both',
                  '@keyframes fadeIn': {
                    from: {
                      opacity: 0,
                    },
                    to: {
                      opacity: 1,
                    },
                  },
                }}
              >
                الإعدادات
              </Typography>
            )}
            {settingsItems.map((item, index) => renderMenuItem(item, index, 1.4))}
          </Box>
        )}
      </Box>

      {/* User Profile at Bottom */}
      <Box
        sx={{
          padding: '16px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarExpanded ? 'space-between' : 'center',
          flexDirection: sidebarExpanded ? 'row' : 'column',
          gap: sidebarExpanded ? 0 : 1.5,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#F9FAFB',
          },
        }}
      >
        {sidebarExpanded ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#0c2b7a' }}>
                {userName.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  {userName}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                  {userRole ? ROLE_ARABIC_NAMES[userRole] || userRole : 'مستخدم'}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={onLogout} title="تسجيل الخروج">
              <Logout sx={{ fontSize: '18px', color: '#6B7280' }} />
            </IconButton>
          </>
        ) : (
          <>
            <Tooltip title={userName} placement="right" arrow>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#0c2b7a' }}>
                {userName.charAt(0).toUpperCase()}
              </Avatar>
            </Tooltip>
            <Tooltip title="تسجيل الخروج" placement="right" arrow>
              <IconButton size="small" onClick={onLogout}>
                <Logout sx={{ fontSize: '18px', color: '#6B7280' }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
  );
}

