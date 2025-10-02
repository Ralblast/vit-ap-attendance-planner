import { MIN_ATTENDANCE } from '../data/constants.js';

export const calculateAttendanceData = (classesTaken, classesSkipped, skippedDates, remainingClassDates) => {
  const taken = parseInt(classesTaken) || 0;
  const skipped = parseInt(classesSkipped) || 0;
  
  if (taken < 0 || skipped < 0 || skipped > taken) {
    return { isValid: false };
  }
  
  const remainingClasses = remainingClassDates.length;
  const totalClasses = taken + remainingClasses;
  const currentAtt = taken > 0 ? ((taken - skipped) / taken) * 100 : 0;
  
  if (totalClasses === 0) {
    return { 
      isValid: true, 
      currentAtt: 0, 
      remainingClasses: 0, 
      projectedAtt: 0, 
      remainingSkips: 0 
    };
  }
  
  const totalAllowedSkips = Math.floor(totalClasses * (1 - MIN_ATTENDANCE / 100));
  const remainingSkips = totalAllowedSkips - skipped - skippedDates.length;
  const projectedAttended = (taken - skipped) + (remainingClasses - skippedDates.length);
  const projectedAtt = totalClasses > 0 ? (projectedAttended / totalClasses) * 100 : 0;
  
  return { 
    isValid: true, 
    currentAtt, 
    remainingClasses, 
    projectedAtt, 
    remainingSkips 
  };
};
