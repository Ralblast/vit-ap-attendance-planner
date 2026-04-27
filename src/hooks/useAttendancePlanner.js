import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MIN_ATTENDANCE } from '../data/constants.js'; 
import { formatDate } from '../utils/dateUtils.js';

const BLOCKING_EVENT_TYPES = new Set(['holiday', 'exam', 'other']);

export function useAttendancePlanner(selectedSlot, academicCalendar, lastInstructionalDay) {
  const [classesTaken, setClassesTaken] = useState('');
  const [classesAttended, setClassesAttended] = useState('');
  const [skippedDates, setSkippedDates] = useState([]);
  const [showResetNotification, setShowResetNotification] = useState(false);
  
  const prevSlotRef = useRef(null);

  useEffect(() => {
    if (selectedSlot) {
      if (prevSlotRef.current !== selectedSlot.slot) {
        prevSlotRef.current = selectedSlot.slot;
        setClassesTaken('');
        setClassesAttended('');
        setSkippedDates([]);
      }
    }
  }, [selectedSlot]);

  useEffect(() => {
    if (classesTaken && parseInt(classesTaken, 10) > 0) {
      setShowResetNotification(true);
      const timer = setTimeout(() => setShowResetNotification(false), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [classesTaken, classesAttended]);

  const eventsMap = useMemo(() => {
    const map = new Map();
   
    (academicCalendar || []).forEach(event => {
      if (event.date) {
        map.set(formatDate(new Date(event.date + 'T00:00:00')), { type: event.type, name: event.name });
      } else if (event.startDate && event.endDate) {
        let current = new Date(event.startDate + 'T00:00:00');
        const end = new Date(event.endDate + 'T00:00:00');
        while (current <= end) {
          map.set(formatDate(current), { type: event.type, name: event.name });
          current.setDate(current.getDate() + 1);
        }
      }
    });
    return map;
  }, [academicCalendar]);

  const blockedDateSet = useMemo(() => {
    const dates = new Set();
    eventsMap.forEach((event, date) => {
      if (BLOCKING_EVENT_TYPES.has(event.type)) {
        dates.add(date);
      }
    });
    return dates;
  }, [eventsMap]);

  const remainingClassDates = useMemo(() => {
    if (!selectedSlot || !lastInstructionalDay) return [];
    let dates = [];
    let currentDate = new Date();
    while (currentDate <= lastInstructionalDay) {
      if (
        selectedSlot.days.includes(currentDate.getDay()) &&
        !blockedDateSet.has(formatDate(currentDate))
      ) {
        dates.push(formatDate(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [blockedDateSet, lastInstructionalDay, selectedSlot]);

  const calculationData = useMemo(() => {
    const taken = parseInt(classesTaken, 10) || 0;
    const attended = parseInt(classesAttended, 10) || 0;

    if (taken < 0 || attended < 0 || attended > taken) {
      return { isValid: false };
    }

    const skipped = taken - attended;
    const remainingClasses = remainingClassDates.length;
    const totalClasses = taken + remainingClasses;
    const currentAtt = taken > 0 ? (attended / taken) * 100 : 0;
    
    if (totalClasses === 0)
      return { isValid: true, currentAtt: 0, remainingClasses: 0, projectedAtt: 0, remainingSkips: 0 };

    const totalAllowedSkips = Math.floor(totalClasses * (1 - MIN_ATTENDANCE / 100));
    const remainingSkips = totalAllowedSkips - skipped - skippedDates.length;
    const projectedAttended = attended + (remainingClasses - skippedDates.length);
    const projectedAtt = totalClasses > 0 ? (projectedAttended / totalClasses) * 100 : 0;
    
    return { isValid: true, currentAtt, remainingClasses, projectedAtt, remainingSkips };
  }, [classesTaken, classesAttended, skippedDates, remainingClassDates]);
  
  const showProjection = useMemo(
    () =>
      classesTaken &&
      parseInt(classesTaken, 10) > 0 &&
      parseInt(classesAttended, 10) >= 0 &&
      calculationData.isValid,
    [classesTaken, classesAttended, calculationData]
  );

  const handleDateToggle = useCallback(dateStr => {
    setSkippedDates(previous => {
      const next = new Set(previous);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return Array.from(next);
    });
  }, []);
  
  return {
    classesTaken, setClassesTaken,
    classesAttended, setClassesAttended,
    skippedDates, setSkippedDates,
    showResetNotification,
    eventsMap,
    remainingClassDates,
    calculationData,
    showProjection,
    handleDateToggle,
  };
}
