import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { academicCalendar } from '../data/academicCalendar.js';
import { LAST_INSTRUCTIONAL_DAY, MIN_ATTENDANCE } from '../data/constants.js';
import { formatDate } from '../utils/dateUtils.js';

export function useAttendancePlanner(selectedSlot) {
  const [classesTaken, setClassesTaken] = useState('');
  const [classesAttended, setClassesAttended] = useState('');
  const [skippedDates, setSkippedDates] = useState([]);
  const [showResetNotification, setShowResetNotification] = useState(false);
  
  const isInitialMount = useRef(true);
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
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSkippedDates([]);
    if (parseInt(classesTaken) > 0) {
      setShowResetNotification(true);
      const timer = setTimeout(() => setShowResetNotification(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [classesTaken]);

  const eventsMap = useMemo(() => {
    const map = new Map();
    academicCalendar.forEach(event => {
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
  }, []);

  const holidayDateSet = useMemo(() => {
    const dates = new Set();
    eventsMap.forEach((event, date) => {
      if (event.type === 'holiday' || event.type === 'exam') {
        dates.add(date);
      }
    });
    return dates;
  }, [eventsMap]);

  const remainingClassDates = useMemo(() => {
    if (!selectedSlot) return [];
    let dates = [];
    let currentDate = new Date();
    while (currentDate <= LAST_INSTRUCTIONAL_DAY) {
      if (
        selectedSlot.days.includes(currentDate.getDay()) &&
        !holidayDateSet.has(formatDate(currentDate))
      ) {
        dates.push(formatDate(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [selectedSlot, holidayDateSet]);

  const calculationData = useMemo(() => {
    const taken = parseInt(classesTaken) || 0;
    const attended = parseInt(classesAttended) || 0;

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
    () => classesTaken && parseInt(classesTaken) > 0 && parseInt(classesAttended) >= 0 && calculationData.isValid,
    [classesTaken, classesAttended, calculationData]
  );

  const handleDateToggle = useCallback(dateStr => {
    setSkippedDates(prev => {
      const newDates = new Set(prev);
      newDates.has(dateStr) ? newDates.delete(dateStr) : newDates.add(dateStr);
      return Array.from(newDates);
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