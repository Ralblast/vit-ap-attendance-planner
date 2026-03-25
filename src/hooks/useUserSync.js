import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebase.js';

const USER_COLLECTION = 'users';
const WRITE_DEBOUNCE_MS = 1500;
const DEFAULT_THEME = 'dark';
const EMPTY_STRING = '';

const createCourseId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `course-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
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
  slotLabel: course?.slotLabel || EMPTY_STRING,
  slotDays: Array.isArray(course?.slotDays) ? course.slotDays : [],
  classesTaken: toSafeNumber(course?.classesTaken),
  classesAttended: toSafeNumber(course?.classesAttended),
  skippedDates: Array.isArray(course?.skippedDates) ? course.skippedDates : [],
  lastUpdated: course?.lastUpdated || new Date(),
});

const createEmptyUserData = theme => ({
  selectedYear: EMPTY_STRING,
  selectedCredit: EMPTY_STRING,
  selectedSlot: EMPTY_STRING,
  slotDays: [],
  courses: [],
  theme: theme || DEFAULT_THEME,
  lastUpdated: new Date(),
});

const normalizeUserData = (data, theme) => {
  if (!data) {
    return null;
  }

  return {
    selectedYear: data.selectedYear || EMPTY_STRING,
    selectedCredit: data.selectedCredit || EMPTY_STRING,
    selectedSlot: data.selectedSlot || EMPTY_STRING,
    slotDays: Array.isArray(data.slotDays) ? data.slotDays : [],
    courses: Array.isArray(data.courses) ? data.courses.map(normalizeCourse) : [],
    theme: data.theme || theme || DEFAULT_THEME,
    lastUpdated: data.lastUpdated || new Date(),
  };
};

const serializeUserData = userData => ({
  selectedYear: userData.selectedYear || EMPTY_STRING,
  selectedCredit: userData.selectedCredit || EMPTY_STRING,
  selectedSlot: userData.selectedSlot || EMPTY_STRING,
  slotDays: Array.isArray(userData.slotDays) ? userData.slotDays : [],
  courses: Array.isArray(userData.courses)
    ? userData.courses.map(course => ({
        id: course.id,
        slotLabel: course.slotLabel,
        slotDays: Array.isArray(course.slotDays) ? course.slotDays : [],
        classesTaken: toSafeNumber(course.classesTaken),
        classesAttended: toSafeNumber(course.classesAttended),
        skippedDates: Array.isArray(course.skippedDates) ? course.skippedDates : [],
        lastUpdated: course.lastUpdated || new Date(),
      }))
    : [],
  theme: userData.theme || DEFAULT_THEME,
  lastUpdated: userData.lastUpdated || new Date(),
});

export function useUserSync(user, theme) {
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

        setUserData(
          snapshot.exists()
            ? normalizeUserData(snapshot.data(), DEFAULT_THEME)
            : createEmptyUserData(theme)
        );
        setErrorMessage('');
        skipPersistRef.current = true;
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load user data from Firestore.', error);

        if (isMounted) {
          setUserData(createEmptyUserData(theme));
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
  }, [theme, userDocRef]);

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
        await setDoc(userDocRef, serializeUserData(userData), { merge: true });
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
      try {
        const slotLabel = slotObj?.slot || EMPTY_STRING;
        const slotDays = Array.isArray(slotObj?.days) ? slotObj.days : [];
        const timestamp = new Date();
        const currentData = userDataRef.current
          ? normalizeUserData(userDataRef.current, theme)
          : createEmptyUserData(theme);
        const existingCourse = currentData.courses.find(course => course.slotLabel === slotLabel);
        const savedCourse = existingCourse
          ? {
              ...existingCourse,
              slotDays,
              lastUpdated: timestamp,
            }
          : {
              id: createCourseId(),
              slotLabel,
              slotDays,
              classesTaken: 0,
              classesAttended: 0,
              skippedDates: [],
              lastUpdated: timestamp,
            };

        setUserData(previousValue => {
          const baseData = previousValue
            ? normalizeUserData(previousValue, theme)
            : currentData;
          const matchingCourse = baseData.courses.find(course => course.slotLabel === slotLabel);
          const nextCourse = matchingCourse
            ? {
                ...matchingCourse,
                slotDays,
                lastUpdated: timestamp,
              }
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
      } catch (error) {
        console.error('Failed to prepare slot data for saving.', error);
        throw error;
      }
    },
    [theme]
  );

  const updateAttendance = useCallback(async (courseId, classesTaken, classesAttended) => {
    try {
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
                  classesTaken: toSafeNumber(classesTaken),
                  classesAttended: toSafeNumber(classesAttended),
                  lastUpdated: timestamp,
                }
              : course
          ),
          lastUpdated: timestamp,
        };
      });
    } catch (error) {
      console.error('Failed to update attendance data.', error);
      throw error;
    }
  }, []);

  const updateSkips = useCallback(async (courseId, skippedDates) => {
    try {
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
    } catch (error) {
      console.error('Failed to update skipped dates.', error);
      throw error;
    }
  }, []);

  const updateTheme = useCallback(async nextTheme => {
    try {
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
    } catch (error) {
      console.error('Failed to update theme preference.', error);
      throw error;
    }
  }, []);

  const deleteCourse = useCallback(async courseId => {
    try {
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
    } catch (error) {
      console.error('Failed to delete course.', error);
      throw error;
    }
  }, []);

  return {
    userData,
    saveSlot,
    updateAttendance,
    updateSkips,
    updateTheme,
    deleteCourse,
    isLoading,
    errorMessage,
  };
}
