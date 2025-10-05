import { useState, useEffect } from 'react';

export function useSemesterData() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    
    fetch('/semester-data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(jsonData => {
      
        jsonData.lastInstructionalDay = new Date(jsonData.lastInstructionalDay);
        setData(jsonData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch semester data:", error);
        setError(error);
        setIsLoading(false);
      });
  }, []); 

  return { data, isLoading, error };
}