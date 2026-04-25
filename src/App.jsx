import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Aperture, BarChart3, Bell, CalendarRange, LayoutDashboard, Loader, Settings, X } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';

import AdminScreen from './Components/AdminScreen.jsx';
import AppFooter from './Components/AppFooter.jsx';
import AuthModal from './Components/AuthModal.jsx';
import CourseSelector from './Components/CourseSelector.jsx';
import DashboardScreen from './Components/DashboardScreen.jsx';
import InsightsScreen from './Components/InsightsScreen.jsx';
import LandingScreen from './Components/LandingScreen.jsx';
import LiveClock from './Components/LiveClock.jsx';
import NotificationsScreen from './Components/NotificationsScreen.jsx';
import PlannerView from './Components/PlannerView.jsx';
import ThemeToggle from './Components/ThemeToggle.jsx';
import { useAttendancePlanner } from './hooks/useAttendancePlanner.js';
import { useSemesterData } from './hooks/useSemesterData.js';
import { useTheme } from './contexts/ThemeContext.jsx';
import { useAuth } from './contexts/AuthContext.jsx';
import { useUserSync } from './hooks/useUserSync.js';

const SCREEN = {
  LANDING: 'landing',
  DASHBOARD: 'dashboard',
  ADD_COURSE: 'add-course',
  PLANNER: 'planner',
  INSIGHTS: 'insights',
  NOTIFICATIONS: 'notifications',
  ADMIN: 'admin',
};

const NAV_ITEMS = [
  { key: SCREEN.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { key: SCREEN.INSIGHTS, label: 'Insights', icon: BarChart3 },
  { key: SCREEN.NOTIFICATIONS, label: 'Alerts', icon: Bell },
  { key: SCREEN.ADMIN, label: 'Admin', icon: Settings, adminOnly: true },
];

const buildSelectedSlot = slotObj => {
  if (!slotObj) {
    return null;
  }

  return {
    slot: slotObj.slot || slotObj.slotLabel || '',
    days: Array.isArray(slotObj.days) ? slotObj.days : slotObj.slotDays || [],
    selectedYear: slotObj.selectedYear || '',
    selectedCredit: slotObj.selectedCredit || '',
  };
};

const parsePlannerValue = value => {
  if (value === '') {
    return 0;
  }

  return Number.parseInt(value, 10) || 0;
};

const truncateEmail = email => {
  if (!email) {
    return '';
  }

  return email.length > 24 ? `${email.slice(0, 21)}...` : email;
};

const LoadingScreen = ({ message }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
    <Loader className="animate-spin text-accent" size={32} />
    <p className="text-sm text-text-secondary">{message}</p>
  </div>
);

const ErrorScreen = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <AlertTriangle className="text-danger" size={32} />
    <h2 className="text-xl font-semibold text-text-primary">Failed to load semester data</h2>
    <p className="max-w-md text-sm text-text-muted">
      Check the semester JSON file and refresh the page.
    </p>
  </div>
);

const AddCourseModal = ({
  isOpen,
  onClose,
  onSlotSelect,
  onSubmit,
  selectedSlot,
  slotsByYear,
  isSubmitting,
  submitLabel,
}) => (
  <AnimatePresence>
    {isOpen ? (
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(28,31,27,0.72)] px-4 backdrop-blur-md"
      >
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md overflow-hidden border border-border-default bg-surface"
        >
          <div className="flex items-center justify-between border-b border-border-default px-6 py-4 text-text-primary">
            <div>
              <p className="eyebrow-label">Course Setup</p>
              <h2 className="mt-1 text-lg font-semibold">Add course slot</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto">
            <CourseSelector
              onSlotSelect={onSlotSelect}
              initialSlot={selectedSlot}
              slotsByYear={slotsByYear}
              layout="modal"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border-default px-6 py-4">
            <p className="text-xs text-text-muted">
              {selectedSlot ? `${selectedSlot.slot} selected` : 'Choose a slot before continuing.'}
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!selectedSlot || isSubmitting}
              className="primary-button min-w-[132px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </Motion.div>
      </Motion.div>
    ) : null}
  </AnimatePresence>
);

export default function App() {
  const { theme } = useTheme();
  const { user, loading: authLoading, logout } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [screen, setScreen] = useState(SCREEN.LANDING);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingCourseSlot, setPendingCourseSlot] = useState(null);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const hydratedCourseIdRef = useRef(null);
  const plannerSyncReadyRef = useRef(false);

  const { data: semesterData, isLoading, error } = useSemesterData();
  const plannerData = useAttendancePlanner(
    selectedSlot,
    semesterData?.academicCalendar,
    semesterData?.lastInstructionalDay
  );
  const {
    userData,
    saveSlot,
    updateAttendance,
    updateSkips,
    updateTheme,
    deleteCourse,
    updatePreferences,
    saveAttendanceSnapshot,
    updateAdminDraft,
    isLoading: isUserSyncLoading,
    errorMessage: userSyncErrorMessage,
  } = useUserSync(user, theme);

  const activeCourse = useMemo(
    () => userData?.courses?.find(course => course.id === activeCourseId) || null,
    [activeCourseId, userData]
  );
  const snapshotsByCourse = useMemo(() => {
    const groups = {};
    (userData?.attendanceSnapshots || []).forEach(snapshot => {
      if (!groups[snapshot.courseId]) {
        groups[snapshot.courseId] = [];
      }
      groups[snapshot.courseId].push(snapshot);
    });
    return groups;
  }, [userData?.attendanceSnapshots]);
  const isAppLoading = isLoading || authLoading || (Boolean(user) && isUserSyncLoading);
  const visibleNavItems = useMemo(
    () =>
      userData?.role === 'admin'
        ? NAV_ITEMS.filter(item => item.adminOnly)
        : NAV_ITEMS.filter(item => !item.adminOnly),
    [userData?.role]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    hydratedCourseIdRef.current = null;
    plannerSyncReadyRef.current = false;
    setSelectedSlot(null);
    setActiveCourseId(null);
    setPendingCourseSlot(null);
    setIsSavingCourse(false);
    setScreen(user ? (userData?.role === 'admin' ? SCREEN.ADMIN : SCREEN.DASHBOARD) : SCREEN.LANDING);
  }, [authLoading, user, userData?.role]);

  useEffect(() => {
    if (!user) {
      return;
    }

    updateTheme(theme).catch(syncError => {
      console.error('Failed to sync theme preference.', syncError);
    });
  }, [theme, updateTheme, user]);

  useEffect(() => {
    if (!user || screen !== SCREEN.PLANNER || !activeCourse || !selectedSlot) {
      return;
    }

    if (hydratedCourseIdRef.current === activeCourseId) {
      return;
    }

    plannerSyncReadyRef.current = false;
    plannerData.setClassesTaken(String(activeCourse.classesTaken ?? 0));
    plannerData.setClassesAttended(String(activeCourse.classesAttended ?? 0));
    plannerData.setSkippedDates(
      Array.isArray(activeCourse.skippedDates) ? activeCourse.skippedDates : []
    );
    hydratedCourseIdRef.current = activeCourseId;
  }, [activeCourse, activeCourseId, plannerData, screen, selectedSlot, user]);

  useEffect(() => {
    if (!user || screen !== SCREEN.PLANNER || !activeCourse) {
      return;
    }

    const expectedTaken = String(activeCourse.classesTaken ?? 0);
    const expectedAttended = String(activeCourse.classesAttended ?? 0);
    const expectedSkips = JSON.stringify(activeCourse.skippedDates || []);
    const currentSkips = JSON.stringify(plannerData.skippedDates || []);

    if (
      expectedTaken === plannerData.classesTaken &&
      expectedAttended === plannerData.classesAttended &&
      expectedSkips === currentSkips
    ) {
      plannerSyncReadyRef.current = true;
    }
  }, [
    activeCourse,
    plannerData.classesAttended,
    plannerData.classesTaken,
    plannerData.skippedDates,
    screen,
    user,
  ]);

  useEffect(() => {
    if (!user || screen !== SCREEN.PLANNER || !activeCourseId || !plannerSyncReadyRef.current) {
      return;
    }

    updateAttendance(
      activeCourseId,
      parsePlannerValue(plannerData.classesTaken),
      parsePlannerValue(plannerData.classesAttended)
    ).then(() => {
      handleSaveSnapshot();
    }).catch(syncError => {
      console.error('Failed to sync attendance changes.', syncError);
    });
  }, [
    activeCourseId,
    plannerData.classesAttended,
    plannerData.classesTaken,
    screen,
    updateAttendance,
    user,
  ]);

  useEffect(() => {
    if (!user || screen !== SCREEN.PLANNER || !activeCourseId || !plannerSyncReadyRef.current) {
      return;
    }

    updateSkips(activeCourseId, plannerData.skippedDates).catch(syncError => {
      console.error('Failed to sync skipped dates.', syncError);
    });
  }, [activeCourseId, plannerData.skippedDates, screen, updateSkips, user]);

  const handleOpenDashboard = () => {
    hydratedCourseIdRef.current = null;
    plannerSyncReadyRef.current = false;
    setSelectedSlot(null);
    setActiveCourseId(null);
    setPendingCourseSlot(null);
    setScreen(user ? (userData?.role === 'admin' ? SCREEN.ADMIN : SCREEN.DASHBOARD) : SCREEN.LANDING);
  };

  const handleOpenCourse = course => {
    hydratedCourseIdRef.current = null;
    plannerSyncReadyRef.current = false;
    setActiveCourseId(course.id);
    setSelectedSlot(
      buildSelectedSlot({
        slot: course.slotLabel,
        days: course.slotDays,
        selectedYear: userData?.selectedYear,
        selectedCredit: userData?.selectedCredit,
      })
    );
    setScreen(SCREEN.PLANNER);
  };

  const handleDeleteCourse = async courseId => {
    try {
      if (activeCourseId === courseId) {
        setActiveCourseId(null);
        setSelectedSlot(null);
      }

      await deleteCourse(courseId);
    } catch (deleteError) {
      console.error('Failed to delete saved course.', deleteError);
    }
  };

  const handleAddCourse = () => {
    setPendingCourseSlot(null);
    setScreen(SCREEN.ADD_COURSE);
  };

  const handleAddCourseClose = () => {
    if (isSavingCourse) {
      return;
    }

    setPendingCourseSlot(null);
    setScreen(user ? (userData?.role === 'admin' ? SCREEN.ADMIN : SCREEN.DASHBOARD) : SCREEN.LANDING);
  };

  const handleSlotSelect = slot => {
    setPendingCourseSlot(buildSelectedSlot(slot));
  };

  const handleSlotSubmit = async () => {
    if (!pendingCourseSlot || isSavingCourse) {
      return;
    }

    if (!user) {
      setSelectedSlot(pendingCourseSlot);
      setPendingCourseSlot(null);
      setScreen(SCREEN.PLANNER);
      return;
    }

    setIsSavingCourse(true);

    try {
      const savedCourse = await saveSlot(
        pendingCourseSlot,
        pendingCourseSlot.selectedYear,
        pendingCourseSlot.selectedCredit
      );

      if (!savedCourse) {
        return;
      }

      hydratedCourseIdRef.current = null;
      plannerSyncReadyRef.current = false;
      setActiveCourseId(savedCourse.id);
      setSelectedSlot(
        buildSelectedSlot({
          slot: savedCourse.slotLabel,
          days: savedCourse.slotDays,
          selectedYear: pendingCourseSlot.selectedYear,
          selectedCredit: pendingCourseSlot.selectedCredit,
        })
      );
      setPendingCourseSlot(null);
      setScreen(SCREEN.PLANNER);
    } catch (saveError) {
      console.error('Failed to save selected course.', saveError);
    } finally {
      setIsSavingCourse(false);
    }
  };

  async function handleSaveSnapshot() {
    if (!user || !activeCourse) {
      return;
    }

    try {
      const { calculateAttendanceAnalytics } = await import('./utils/attendanceAnalytics.js');
      const analytics = calculateAttendanceAnalytics({
        course: {
          ...activeCourse,
          classesTaken: parsePlannerValue(plannerData.classesTaken),
          classesAttended: parsePlannerValue(plannerData.classesAttended),
          skippedDates: plannerData.skippedDates,
        },
        semester: semesterData,
        snapshots: snapshotsByCourse[activeCourse.id] || [],
      });

      const snapshot = {
        id: `snapshot-${Date.now()}`,
        userId: user.uid,
        courseId: activeCourse.id,
        attendancePercentage: analytics.currentAttendance,
        classesTaken: parsePlannerValue(plannerData.classesTaken),
        classesAttended: parsePlannerValue(plannerData.classesAttended),
        riskScore: analytics.riskScore,
        riskLabel: analytics.riskLabel,
        createdAt: new Date().toISOString(),
      };

      await saveAttendanceSnapshot(snapshot);
    } catch (snapshotError) {
      console.error('Failed to save attendance snapshot.', snapshotError);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthModalOpen(false);
    } catch (logoutError) {
      console.error('Failed to sign out.', logoutError);
    }
  };

  const renderWorkspaceScreen = () => {
    if (screen === SCREEN.ADMIN && userData?.role !== 'admin') {
      return (
        <DashboardScreen
          courses={userData?.courses || []}
          onAddCourse={handleAddCourse}
          onOpenCourse={handleOpenCourse}
          onDeleteCourse={handleDeleteCourse}
          semesterData={semesterData}
          snapshotsByCourse={snapshotsByCourse}
        />
      );
    }

    if (screen === SCREEN.PLANNER && selectedSlot) {
      return (
        <PlannerView
          selectedSlot={selectedSlot}
          handleStartOver={handleOpenDashboard}
          plannerData={plannerData}
          semesterData={semesterData}
          activeCourse={activeCourse}
          snapshots={activeCourse ? snapshotsByCourse[activeCourse.id] || [] : []}
          onSaveSnapshot={handleSaveSnapshot}
        />
      );
    }

    if (screen === SCREEN.INSIGHTS) {
      return (
        <InsightsScreen
          courses={userData?.courses || []}
          semesterData={semesterData}
          snapshots={userData?.attendanceSnapshots || []}
        />
      );
    }

    if (screen === SCREEN.NOTIFICATIONS) {
      return (
        <NotificationsScreen
          user={user}
          userData={userData}
          courses={userData?.courses || []}
          semesterData={semesterData}
          onUpdatePreferences={updatePreferences}
        />
      );
    }

    if (screen === SCREEN.ADMIN) {
      return (
        <AdminScreen
          userData={userData}
          semesterData={semesterData}
          onUpdateAdminDraft={updateAdminDraft}
        />
      );
    }

    return (
      <DashboardScreen
        courses={userData?.courses || []}
        onAddCourse={handleAddCourse}
        onOpenCourse={handleOpenCourse}
        onDeleteCourse={handleDeleteCourse}
        semesterData={semesterData}
        snapshotsByCourse={snapshotsByCourse}
      />
    );
  };

  const renderUserContent = () => (
    <div className="mx-auto grid w-full max-w-[1320px] flex-1 gap-8 px-6 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-border-faint pr-6 lg:block">
        <div className="sticky top-8 space-y-8">
          <div>
            <p className="eyebrow-label">Workspace</p>
            <p className="mt-2 text-sm text-text-muted">Academic risk forecasting</p>
          </div>
          <nav className="space-y-1">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const active = screen === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScreen(item.key)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-elevated text-text-primary'
                      : 'text-text-muted hover:bg-subtle hover:text-text-primary'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          {userData?.role !== 'admin' ? (
            <button type="button" onClick={handleAddCourse} className="primary-button w-full">
              <CalendarRange size={16} />
              Add course
            </button>
          ) : null}
        </div>
      </aside>

      <main className="min-w-0">
        {userSyncErrorMessage ? (
          <div className="mb-6 border border-danger bg-danger-dim px-4 py-3 text-sm text-danger">
            {userSyncErrorMessage}
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          <Motion.div
            key={screen === SCREEN.PLANNER ? `${screen}-${activeCourseId || selectedSlot?.slot}` : screen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderWorkspaceScreen()}
          </Motion.div>
        </AnimatePresence>
        <AppFooter />
      </main>
    </div>
  );

  const renderGuestContent = () => {
    if (screen === SCREEN.PLANNER && selectedSlot) {
      return (
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8">
          <PlannerView
            selectedSlot={selectedSlot}
            handleStartOver={handleOpenDashboard}
            plannerData={plannerData}
            semesterData={semesterData}
          />
          <AppFooter />
        </main>
      );
    }

    return (
      <LandingScreen
        onStartGuest={handleAddCourse}
        onSignIn={() => setIsAuthModalOpen(true)}
      />
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-base text-text-primary">
      <header className="border-b border-border-faint bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center justify-between gap-4 px-6">
          <button
            type="button"
            onClick={handleOpenDashboard}
            className="flex items-center gap-3 text-left"
          >
            <Aperture className="text-accent" size={20} />
            <div>
              <h1 className="font-display text-sm font-semibold text-text-primary">
                VIT-AP Attendance Planner
              </h1>
              <p className="hidden text-xs text-text-muted sm:block">VIT-AP planning workspace</p>
            </div>
          </button>

          <div className="flex items-center gap-4">
            <LiveClock />
            <ThemeToggle />

            {!user ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="ghost-button px-3 py-1.5"
              >
                Sign in
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span
                  className="hidden max-w-[180px] truncate text-sm text-text-muted sm:block"
                  title={user.email || ''}
                >
                  {truncateEmail(user.email)}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-text-muted transition-colors hover:text-danger"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isAppLoading ? (
        <LoadingScreen
          message={user ? 'Loading your workspace...' : 'Loading academic calendar...'}
        />
      ) : error ? (
        <ErrorScreen />
      ) : user ? (
        renderUserContent()
      ) : (
        renderGuestContent()
      )}

      <AddCourseModal
        isOpen={screen === SCREEN.ADD_COURSE}
        onClose={handleAddCourseClose}
        onSlotSelect={handleSlotSelect}
        onSubmit={handleSlotSubmit}
        selectedSlot={pendingCourseSlot}
        slotsByYear={semesterData?.slotsByYear}
        isSubmitting={isSavingCourse}
        submitLabel={user ? 'Save course' : 'Open planner'}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() =>
          setScreen(userData?.role === 'admin' ? SCREEN.ADMIN : SCREEN.DASHBOARD)
        }
      />
    </div>
  );
}
