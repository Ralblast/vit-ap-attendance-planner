import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebase.js';

const USER_COLLECTION = 'users';
const WRITE_DEBOUNCE_MS = 1500;
const DEFAULT_THEME = 'dark';
const EMPTY_STRING = '';
const DEFAULT_ALERT_THRESHOLD = 78;

const createCourseId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `course-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const normalizeDateValue = (value, fallback = new Date().toISOString()) => {
  if (!value) {
    return fallback;
  }

  if (typeof value?.toDate === 'function') {
    return normalizeDateValue(value.toDate(), fallback);
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString();
  }

  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return normalizeDateValue(new Date(value.seconds * 1000), fallback);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const toSafeNumber = value => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
};

const normalizeCourse = course => ({
  id: course?.id || createCourseId(),
  courseName: course?.courseName || course?.slotLabel || EMPTY_STRING,
  slotLabel: course?.slotLabel || EMPTY_STRING,
  slotDays: Array.isArray(course?.slotDays) ? course.slotDays : [],
  credit: course?.credit || EMPTY_STRING,
  classesTaken: toSafeNumber(course?.classesTaken),
  classesAttended: toSafeNumber(course?.classesAttended),
  skippedDates: Array.isArray(course?.skippedDates) ? course.skippedDates : [],
  // Per-day attendance the student logged via the precise-skip picker.
  // Distinct from skippedDates (which is forward planning intent) — these
  // are confirmed past misses with exact dates, used for honest heatmap
  // colouring. Kept optional so older docs without this field stay valid.
  missedDates: Array.isArray(course?.missedDates) ? course.missedDates : [],
  // Class days the slot calendar expected to happen but didn't (faculty
  // cancelled, university closure, etc.). Excluded from totalClassDays in
  // the heatmap and excluded as candidates from the missed-picker so a
  // single date can never be both cancelled and missed.
  cancelledDates: Array.isArray(course?.cancelledDates) ? course.cancelledDates : [],
  lastUpdated: normalizeDateValue(course?.lastUpdated),
});

const normalizeSnapshot = snapshot => ({
  id: snapshot?.id || createCourseId(),
  courseId: snapshot?.courseId || EMPTY_STRING,
  attendancePercentage: toSafeNumber(snapshot?.attendancePercentage),
  classesTaken: toSafeNumber(snapshot?.classesTaken),
  classesAttended: toSafeNumber(snapshot?.classesAttended),
  riskScore: toSafeNumber(snapshot?.riskScore),
  riskLabel: snapshot?.riskLabel || 'Safe',
  createdAt: normalizeDateValue(snapshot?.createdAt),
});

const normalizeAdminDraft = draft => ({
  semesterName: draft?.semesterName || 'Winter 2025-26',
  minAttendance: toSafeNumber(draft?.minAttendance || 75),
  lastInstructionalDay: draft?.lastInstructionalDay || EMPTY_STRING,
  eventCount: toSafeNumber(draft?.eventCount),
  slotVersion: draft?.slotVersion || 'VIT-AP active mapping',
});

const normalizeNotificationChannels = channels => {
  const telegram = channels?.telegram || {};
  return {
    telegram: {
      botToken: typeof telegram.botToken === 'string' ? telegram.botToken : EMPTY_STRING,
      chatId: typeof telegram.chatId === 'string' ? telegram.chatId : EMPTY_STRING,
    },
  };
};

const createEmptyUserData = (theme, user, role) => ({
  name: EMPTY_STRING,
  email: user?.email || EMPTY_STRING,
  role: role || 'student',
  selectedYear: EMPTY_STRING,
  selectedCredit: EMPTY_STRING,
  selectedSlot: EMPTY_STRING,
  slotDays: [],
  courses: [],
  attendanceSnapshots: [],
  alertEnabled: true,
  alertThreshold: DEFAULT_ALERT_THRESHOLD,
  weeklySummaryEnabled: true,
  notificationChannels: normalizeNotificationChannels(),
  lastEmailSentAt: EMPTY_STRING,
  lastCheckedAt: EMPTY_STRING,
  adminDraft: normalizeAdminDraft(),
  theme: theme || DEFAULT_THEME,
  lastUpdated: normalizeDateValue(new Date()),
});

const normalizeUserData = (data, theme, user, role) => {
  if (!data) {
    return null;
  }

  return {
    name: data.name || EMPTY_STRING,
    email: data.email || user?.email || EMPTY_STRING,
    role: role || (data.role === 'admin' ? 'admin' : 'student'),
    selectedYear: data.selectedYear || EMPTY_STRING,
    selectedCredit: data.selectedCredit || EMPTY_STRING,
    selectedSlot: data.selectedSlot || EMPTY_STRING,
    slotDays: Array.isArray(data.slotDays) ? data.slotDays : [],
    courses: Array.isArray(data.courses) ? data.courses.map(normalizeCourse) : [],
    attendanceSnapshots: Array.isArray(data.attendanceSnapshots)
      ? data.attendanceSnapshots.map(normalizeSnapshot)
      : [],
    alertEnabled: data.alertEnabled !== false,
    alertThreshold: toSafeNumber(data.alertThreshold || DEFAULT_ALERT_THRESHOLD),
    weeklySummaryEnabled: data.weeklySummaryEnabled !== false,
    notificationChannels: normalizeNotificationChannels(data.notificationChannels),
    lastEmailSentAt: data.lastEmailSentAt || EMPTY_STRING,
    lastCheckedAt: data.lastCheckedAt || EMPTY_STRING,
    adminDraft: normalizeAdminDraft(data.adminDraft),
    theme: data.theme || theme || DEFAULT_THEME,
    lastUpdated: normalizeDateValue(data.lastUpdated),
  };
};

// Server-controlled fields (role, email, lastEmailSentAt) are excluded from
// client writes; Firestore rules reject them and the cron owns them.
const serializeUserData = (userData, isInitialCreate) => {
  const payload = {
    name: userData.name || EMPTY_STRING,
    selectedYear: userData.selectedYear || EMPTY_STRING,
    selectedCredit: userData.selectedCredit || EMPTY_STRING,
    selectedSlot: userData.selectedSlot || EMPTY_STRING,
    slotDays: Array.isArray(userData.slotDays) ? userData.slotDays : [],
    courses: Array.isArray(userData.courses)
      ? userData.courses.map(course => ({
          id: course.id,
          courseName: course.courseName || course.slotLabel || EMPTY_STRING,
          slotLabel: course.slotLabel,
          slotDays: Array.isArray(course.slotDays) ? course.slotDays : [],
          credit: course.credit || EMPTY_STRING,
          classesTaken: toSafeNumber(course.classesTaken),
          classesAttended: toSafeNumber(course.classesAttended),
          skippedDates: Array.isArray(course.skippedDates) ? course.skippedDates : [],
          missedDates: Array.isArray(course.missedDates) ? course.missedDates : [],
          cancelledDates: Array.isArray(course.cancelledDates) ? course.cancelledDates : [],
          lastUpdated: normalizeDateValue(course.lastUpdated),
        }))
      : [],
    attendanceSnapshots: Array.isArray(userData.attendanceSnapshots)
      ? userData.attendanceSnapshots.slice(-120).map(normalizeSnapshot)
      : [],
    alertEnabled: userData.alertEnabled !== false,
    alertThreshold: toSafeNumber(userData.alertThreshold || DEFAULT_ALERT_THRESHOLD),
    weeklySummaryEnabled: userData.weeklySummaryEnabled !== false,
    notificationChannels: normalizeNotificationChannels(userData.notificationChannels),
    lastCheckedAt: userData.lastCheckedAt || EMPTY_STRING,
    adminDraft: normalizeAdminDraft(userData.adminDraft),
    theme: userData.theme || DEFAULT_THEME,
    lastUpdated: normalizeDateValue(userData.lastUpdated),
  };

  if (isInitialCreate && userData.email) {
    payload.email = userData.email;
  }

  return payload;
};

export function useUserSync(user, theme, isAdmin = false) {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const userDocRef = useMemo(
    () => (user ? doc(db, USER_COLLECTION, user.uid) : null),
    [user]
  );
  const userDataRef = useRef(null);
  const debounceRef = useRef(null);
  const skipPersistRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const docExistsRef = useRef(false);
  const role = isAdmin ? 'admin' : 'student';

  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!userDocRef) {
      setUserData(null);
      setIsLoading(false);
      setErrorMessage('');
      skipPersistRef.current = true;
      hasLoadedRef.current = false;
      docExistsRef.current = false;
      return undefined;
    }

    let isMounted = true;

    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const snapshot = await getDoc(userDocRef);

        if (!isMounted) {
          return;
        }

        docExistsRef.current = snapshot.exists();
        setUserData(
          snapshot.exists()
            ? normalizeUserData(snapshot.data(), DEFAULT_THEME, user, role)
            : createEmptyUserData(theme, user, role)
        );
        setErrorMessage('');
        skipPersistRef.current = true;
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load user data from Firestore.', error);

        if (isMounted) {
          setUserData(createEmptyUserData(theme, user, role));
          setErrorMessage(
            'Unable to load saved dashboard data. Check your Firestore rules for users/{uid}.'
          );
          skipPersistRef.current = true;
          hasLoadedRef.current = true;
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
      clearTimeout(debounceRef.current);
    };
  }, [role, theme, user, userDocRef]);

  useEffect(() => {
    if (!userDocRef || !hasLoadedRef.current || !userData) {
      return undefined;
    }

    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return undefined;
    }

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const isInitialCreate = !docExistsRef.current;
        await setDoc(userDocRef, serializeUserData(userData, isInitialCreate), { merge: true });
        docExistsRef.current = true;
        setErrorMessage('');
      } catch (error) {
        console.error('Failed to save user data to Firestore.', error);
        setErrorMessage(
          'Unable to save changes to Firestore. Check your Firestore rules for users/{uid}.'
        );
      }
    }, WRITE_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [userData, userDocRef]);

  const saveSlot = useCallback(
    async (slotObj, year, credit) => {
      const slotLabel = slotObj?.slot || EMPTY_STRING;
      const slotDays = Array.isArray(slotObj?.days) ? slotObj.days : [];
      const timestamp = new Date();
      const baseFromRef = userDataRef.current
        ? normalizeUserData(userDataRef.current, theme, user, role)
        : createEmptyUserData(theme, user, role);
      const existingCourse = baseFromRef.courses.find(course => course.slotLabel === slotLabel);
      const savedCourse = existingCourse
        ? { ...existingCourse, slotDays, credit: credit || EMPTY_STRING, lastUpdated: timestamp }
        : {
            id: createCourseId(),
            courseName: slotLabel,
            slotLabel,
            slotDays,
            credit: credit || EMPTY_STRING,
            classesTaken: 0,
            classesAttended: 0,
            skippedDates: [],
            lastUpdated: timestamp,
          };

      setUserData(previousValue => {
        const baseData = previousValue
          ? normalizeUserData(previousValue, theme, user, role)
          : baseFromRef;
        const matchingCourse = baseData.courses.find(course => course.slotLabel === slotLabel);
        const nextCourse = matchingCourse
          ? { ...matchingCourse, slotDays, credit: credit || EMPTY_STRING, lastUpdated: timestamp }
          : savedCourse;

        const courses = matchingCourse
          ? baseData.courses.map(course =>
              course.id === matchingCourse.id ? nextCourse : course
            )
          : [...baseData.courses, nextCourse];

        return {
          ...baseData,
          selectedYear: year || EMPTY_STRING,
          selectedCredit: credit || EMPTY_STRING,
          selectedSlot: slotLabel,
          slotDays,
          courses,
          theme: baseData.theme || theme || DEFAULT_THEME,
          lastUpdated: timestamp,
        };
      });

      return savedCourse;
    },
    [role, theme, user]
  );

  const updateAttendance = useCallback(async (courseId, classesTaken, classesAttended) => {
    const timestamp = new Date();
    const safeClassesTaken = toSafeNumber(classesTaken);
    const safeClassesAttended = Math.min(toSafeNumber(classesAttended), safeClassesTaken);

    setUserData(previousValue => {
      if (!previousValue) {
        return previousValue;
      }

      return {
        ...previousValue,
        lastCheckedAt: timestamp.toISOString(),
        courses: previousValue.courses.map(course =>
          course.id === courseId
            ? {
                ...course,
                classesTaken: safeClassesTaken,
                classesAttended: safeClassesAttended,
                lastUpdated: timestamp,
              }
            : course
        ),
        lastUpdated: timestamp,
      };
    });
  }, []);

  const updateSkips = useCallback(async (courseId, skippedDates) => {
    const timestamp = new Date();

    setUserData(previousValue => {
      if (!previousValue) {
        return previousValue;
      }

      return {
        ...previousValue,
        courses: previousValue.courses.map(course =>
          course.id === courseId
            ? {
                ...course,
                skippedDates: Array.isArray(skippedDates) ? skippedDates : [],
                lastUpdated: timestamp,
              }
            : course
        ),
        lastUpdated: timestamp,
      };
    });
  }, []);

  const updateTheme = useCallback(async nextTheme => {
    const timestamp = new Date();

    setUserData(previousValue => {
      if (!previousValue) {
        return previousValue;
      }

      return {
        ...previousValue,
        theme: nextTheme || DEFAULT_THEME,
        lastUpdated: timestamp,
      };
    });
  }, []);

  const deleteCourse = useCallback(async courseId => {
    const timestamp = new Date();

    setUserData(previousValue => {
      if (!previousValue) {
        return previousValue;
      }

      const courses = previousValue.courses.filter(course => course.id !== courseId);
      const fallbackCourse = courses[0] || null;

      return {
        ...previousValue,
        selectedSlot: fallbackCourse?.slotLabel || EMPTY_STRING,
        slotDays: fallbackCourse?.slotDays || [],
        courses,
        lastUpdated: timestamp,
      };
    });
  }, []);

  const updatePreferences = useCallback(async preferences => {
    const timestamp = new Date();

    setUserData(previousValue => {
      if (!previousValue) {
        return previousValue;
      }

      return {
        ...previousValue,
        alertEnabled: preferences.alertEnabled ?? previousValue.alertEnabled,
        alertThreshold: toSafeNumber(preferences.alertThreshold ?? previousValue.alertThreshold),
        weeklySummaryEnabled:
          preferences.weeklySummaryEnabled ?? previousValue.weeklySummaryEnabled,
        notificationChannels: preferences.notificationChannels
          ? normalizeNotificationChannels(preferences.notificationChannels)
          : previousValue.notificationChannels,
        lastUpdated: timestamp,
      };
    });
  }, []);

  const saveAttendanceSnapshot = useCallback(async snapshot => {
    const timestamp = new Date();

    setUserData(previousValue => {
      if (!previousValue) {
        return previousValue;
      }

      const nextSnapshot = normalizeSnapshot({
        ...snapshot,
        createdAt: snapshot?.createdAt || timestamp,
      });

      const existingSnapshots = previousValue.attendanceSnapshots || [];
      const nextDateStr = new Date(nextSnapshot.createdAt).toDateString();

      let replaced = false;
      const newSnapshots = existingSnapshots.map(existing => {
        if (
          existing.courseId === nextSnapshot.courseId &&
          new Date(existing.createdAt).toDateString() === nextDateStr
        ) {
          replaced = true;
          return nextSnapshot;
        }
        return existing;
      });

      if (!replaced) {
        newSnapshots.push(nextSnapshot);
      }

      return {
        ...previousValue,
        attendanceSnapshots: newSnapshots.slice(-120),
        lastUpdated: timestamp,
      };
    });
  }, []);

  // Bulk attendance update from the Dashboard's Update Attendance strip.
  // Accepts an array of { courseId, classesTaken, classesAttended, missedDates? }
  // entries; writes new totals, appends precise missed dates, and emits one
  // snapshot per course (deduped per-day by saveAttendanceSnapshot).
  const updateBulkAttendance = useCallback(async entries => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }
    const timestamp = new Date();
    const isoNow = timestamp.toISOString();

    setUserData(previousValue => {
      if (!previousValue) {
        return previousValue;
      }

      const entryByCourse = new Map();
      entries.forEach(entry => {
        if (entry?.courseId) {
          entryByCourse.set(entry.courseId, entry);
        }
      });

      const nextCourses = previousValue.courses.map(course => {
        const entry = entryByCourse.get(course.id);
        if (!entry) {
          return course;
        }
        const safeTaken = toSafeNumber(entry.classesTaken);
        const safeAttended = Math.min(toSafeNumber(entry.classesAttended), safeTaken);
        const newMissed = Array.isArray(entry.missedDates) ? entry.missedDates : [];
        const newCancelled = Array.isArray(entry.cancelledDates) ? entry.cancelledDates : [];
        const mergedMissed = Array.from(
          new Set([...(course.missedDates || []), ...newMissed])
        );
        const mergedCancelled = Array.from(
          new Set([...(course.cancelledDates || []), ...newCancelled])
        );
        return {
          ...course,
          classesTaken: safeTaken,
          classesAttended: safeAttended,
          missedDates: mergedMissed,
          cancelledDates: mergedCancelled,
          lastUpdated: timestamp,
        };
      });

      const existingSnapshots = previousValue.attendanceSnapshots || [];
      const todayDateStr = timestamp.toDateString();
      let snapshots = existingSnapshots.slice();

      entries.forEach(entry => {
        if (!entry?.courseId) return;
        const safeTaken = toSafeNumber(entry.classesTaken);
        const safeAttended = Math.min(toSafeNumber(entry.classesAttended), safeTaken);
        const pct = safeTaken > 0 ? (safeAttended / safeTaken) * 100 : 0;
        const newSnapshot = normalizeSnapshot({
          id: `snapshot-${entry.courseId}-${timestamp.getTime()}`,
          courseId: entry.courseId,
          attendancePercentage: Number(pct.toFixed(1)),
          classesTaken: safeTaken,
          classesAttended: safeAttended,
          riskScore: 0,
          riskLabel: 'Safe',
          createdAt: isoNow,
        });

        let replaced = false;
        snapshots = snapshots.map(existing => {
          if (
            existing.courseId === newSnapshot.courseId &&
            new Date(existing.createdAt).toDateString() === todayDateStr
          ) {
            replaced = true;
            return newSnapshot;
          }
          return existing;
        });
        if (!replaced) {
          snapshots.push(newSnapshot);
        }
      });

      return {
        ...previousValue,
        courses: nextCourses,
        attendanceSnapshots: snapshots.slice(-120),
        lastCheckedAt: isoNow,
        lastUpdated: timestamp,
      };
    });
  }, []);

  const updateAdminDraft = useCallback(async adminDraft => {
    const timestamp = new Date();

    setUserData(previousValue => {
      if (!previousValue) {
        return previousValue;
      }

      return {
        ...previousValue,
        adminDraft: normalizeAdminDraft({
          ...previousValue.adminDraft,
          ...adminDraft,
        }),
        lastUpdated: timestamp,
      };
    });
  }, []);

  return {
    userData,
    saveSlot,
    updateAttendance,
    updateBulkAttendance,
    updateSkips,
    updateTheme,
    deleteCourse,
    updatePreferences,
    saveAttendanceSnapshot,
    updateAdminDraft,
    isLoading,
    errorMessage,
  };
}
