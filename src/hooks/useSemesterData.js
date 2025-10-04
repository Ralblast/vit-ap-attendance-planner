import { useState, useEffect } from 'react';

export function useSemesterData() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // We use a `fetch` function to get the JSON file from the `public` folder
    fetch('/semester-data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(jsonData => {
        // We need to convert the date string back into a real Date object
        jsonData.lastInstructionalDay = new Date(jsonData.lastInstructionalDay);
        setData(jsonData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch semester data:", error);
        setError(error);
        setIsLoading(false);
      });
  }, []); // The empty array [] means this effect runs only once

  return { data, isLoading, error };
}