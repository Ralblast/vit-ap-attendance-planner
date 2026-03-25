import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Aperture, AlertTriangle, BookOpen, Loader, Menu, X } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';

import AppFooter from './Components/AppFooter.jsx';
import AuthModal from './Components/AuthModal.jsx';
import CourseSelector from './Components/CourseSelector.jsx';
import DashboardScreen from './Components/DashboardScreen.jsx';
import FeedbackBanner from './Components/FeedbackBanner.jsx';
import LiveClock from './Components/LiveClock.jsx';
import PlannerView from './Components/PlannerView.jsx';
import ThemeToggle from './Components/ThemeToggle.jsx';
import { useAttendancePlanner } from './hooks/useAttendancePlanner.js';
import { useSemesterData } from './hooks/useSemesterData.js';
import { useTheme } from './contexts/ThemeContext.jsx';
import { useAuth } from './contexts/AuthContext.jsx';
import { useUserSync } from './hooks/useUserSync.js';

const SCREEN = {
  WELCOME: 'welcome',
  DASHBOARD: 'dashboard',
  ADD_COURSE: 'add-course',
  PLANNER: 'planner',
};

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

const truncateEmail = email => {
  if (!email) {
    return '';
  }

  return email.length > 24 ? `${email.slice(0, 21)}...` : email;
};

const parsePlannerValue = value => {
  if (value === '') {
    return 0;
  }

  return Number.parseInt(value, 10) || 0;
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
    <h2 className="text-xl font-semibold text-text-primary">Failed to Load Data</h2>
    <p className="max-w-md text-sm text-text-muted">
      The application could not load the required semester data. Please check your
      network connection and try refreshing the page.
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
}) => (
  <AnimatePresence>
    {isOpen ? (
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.7)] px-4 backdrop-blur-md"
      >
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-border-default bg-surface"
        >
          <div className="flex items-center justify-between border-b border-border-default px-6 py-4 text-text-primary">
            <div>
              <p className="eyebrow-label text-accent">Dashboard</p>
              <h2 className="mt-1 text-lg font-semibold">Add Course</h2>
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
              {selectedSlot
                ? `${selectedSlot.slot} selected and ready to save`
                : 'Choose your slot details, then save the course.'}
            </p>
            <Motion.button
              type="button"
              onClick={onSubmit}
              whileHover={!selectedSlot || isSubmitting ? undefined : { scale: 1.01 }}
              whileTap={!selectedSlot || isSubmitting ? undefined : { scale: 0.99 }}
              disabled={!selectedSlot || isSubmitting}
              className="primary-button min-w-[136px] justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader size={16} className="animate-spin" /> : null}
              {isSubmitting ? 'Saving...' : 'Save Course'}
            </Motion.button>
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
  const [screen, setScreen] = useState(SCREEN.WELCOME);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    isLoading: isUserSyncLoading,
    errorMessage: userSyncErrorMessage,
  } = useUserSync(user, theme);

  const activeCourse = useMemo(
    () => userData?.courses?.find(course => course.id === activeCourseId) || null,
    [activeCourseId, userData]
  );
  const isAppLoading = isLoading || authLoading || (Boolean(user) && isUserSyncLoading);

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

    if (user) {
      setScreen(SCREEN.DASHBOARD);
      return;
    }

    setScreen(SCREEN.WELCOME);
  }, [authLoading, user]);

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
  }, [
    activeCourse,
    activeCourseId,
    plannerData,
    screen,
    selectedSlot,
    user,
  ]);

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
    ).catch(syncError => {
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

  const handleAuthSuccess = () => {
    hydratedCourseIdRef.current = null;
    plannerSyncReadyRef.current = false;
    setSelectedSlot(null);
    setActiveCourseId(null);
    setScreen(SCREEN.DASHBOARD);
  };

  const handleGuestSlotSelect = slot => {
    setSelectedSlot(buildSelectedSlot(slot));
  };

  const handleOpenDashboard = () => {
    hydratedCourseIdRef.current = null;
    plannerSyncReadyRef.current = false;
    setSelectedSlot(null);
    setActiveCourseId(null);
    setPendingCourseSlot(null);
    setScreen(SCREEN.DASHBOARD);
  };

  const handlePlannerExit = () => {
    hydratedCourseIdRef.current = null;
    plannerSyncReadyRef.current = false;
    setPendingCourseSlot(null);

    if (user) {
      setSelectedSlot(null);
      setActiveCourseId(null);
      setScreen(SCREEN.DASHBOARD);
      return;
    }

    setSelectedSlot(null);
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
    setScreen(SCREEN.DASHBOARD);
  };

  const handleLoggedInSlotSelect = slot => {
    setPendingCourseSlot(buildSelectedSlot(slot));
  };

  const handleLoggedInSlotSubmit = async () => {
    if (!pendingCourseSlot || isSavingCourse) {
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

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthModalOpen(false);
    } catch (logoutError) {
      console.error('Failed to sign out.', logoutError);
    }
  };

  const renderGuestContent = () => (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-6">
      <FeedbackBanner />
      <div className="mt-6 flex flex-1 flex-col gap-6 md:flex-row">
        <Motion.div
          animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="hidden overflow-hidden md:block"
        >
          <CourseSelector
            onSlotSelect={handleGuestSlotSelect}
            initialSlot={selectedSlot}
            slotsByYear={semesterData.slotsByYear}
          />
        </Motion.div>

        <div className="md:hidden">
          <CourseSelector
            onSlotSelect={handleGuestSlotSelect}
            initialSlot={selectedSlot}
            slotsByYear={semesterData.slotsByYear}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-grow">
            <AnimatePresence mode="wait">
              {!selectedSlot ? (
                <Motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                  className="flex min-h-[360px] items-center justify-center text-center"
                >
                  <div className="space-y-3">
                    <BookOpen size={32} className="mx-auto text-text-muted" />
                    <h2 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
                      Welcome
                    </h2>
                    <p className="text-sm text-text-muted">
                      Select your course details from the sidebar to begin.
                    </p>
                  </div>
                </Motion.div>
              ) : (
                <PlannerView
                  key={selectedSlot.slot}
                  selectedSlot={selectedSlot}
                  handleStartOver={handlePlannerExit}
                  plannerData={plannerData}
                  lastInstructionalDay={semesterData.lastInstructionalDay}
                />
              )}
            </AnimatePresence>
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );

  const renderUserContent = () => (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-6">
      <FeedbackBanner />
      <div className="mt-6 flex flex-1 overflow-y-auto">
        <main className="flex flex-1 flex-col overflow-y-auto">
          {userSyncErrorMessage ? (
            <div className="mb-4 rounded-lg border border-danger bg-danger-dim px-4 py-3 text-sm text-danger">
              {userSyncErrorMessage}
            </div>
          ) : null}
          <div className="flex-grow">
            <AnimatePresence mode="wait">
              {screen === SCREEN.PLANNER && selectedSlot ? (
                <Motion.div
                  key={`planner-${activeCourseId || selectedSlot.slot}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                >
                  <PlannerView
                    selectedSlot={selectedSlot}
                    handleStartOver={handlePlannerExit}
                    plannerData={plannerData}
                    lastInstructionalDay={semesterData.lastInstructionalDay}
                  />
                </Motion.div>
              ) : (
                <Motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                >
                  <DashboardScreen
                    courses={userData?.courses || []}
                    onAddCourse={handleAddCourse}
                    onOpenCourse={handleOpenCourse}
                    onDeleteCourse={handleDeleteCourse}
                    semesterData={semesterData}
                  />
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
          <AppFooter />
        </main>
      </div>

      <AddCourseModal
        isOpen={screen === SCREEN.ADD_COURSE}
        onClose={handleAddCourseClose}
        onSlotSelect={handleLoggedInSlotSelect}
        onSubmit={handleLoggedInSlotSubmit}
        selectedSlot={pendingCourseSlot}
        slotsByYear={semesterData.slotsByYear}
        isSubmitting={isSavingCourse}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-base font-sans text-text-primary">
      <header className="border-b border-border-default bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            {!user && !isAppLoading && !error ? (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden rounded-lg p-2 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary md:block"
                title="Toggle Sidebar"
              >
                <Menu size={16} />
              </button>
            ) : null}

            <Aperture className="text-accent" size={20} />
            <div>
              <h1 className="text-sm font-semibold text-text-primary">VIT-AP Attendance Planner</h1>
              <p className="text-xs text-text-muted">Attendance planning workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LiveClock />
            <ThemeToggle />

            {!user ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="ghost-button px-3 py-1.5"
              >
                Sign In
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
                  onClick={handleOpenDashboard}
                  className="ghost-button bg-elevated px-3 py-1.5 text-text-primary"
                >
                  Dashboard
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-text-muted transition-colors hover:text-danger"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isAppLoading ? (
        <LoadingScreen
          message={user ? 'Loading your dashboard...' : 'Loading academic calendar...'}
        />
      ) : error ? (
        <ErrorScreen />
      ) : user ? (
        renderUserContent()
      ) : (
        renderGuestContent()
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
