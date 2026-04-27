import { useEffect, useState } from 'react';

export function useSemesterData() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/semester-data.json', { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load semester data (${response.status})`);
        }
        return response.json();
      })
      .then(jsonData => {
        const lastDay = new Date(jsonData.lastInstructionalDay);
        setData({
          ...jsonData,
          lastInstructionalDay: Number.isNaN(lastDay.getTime()) ? null : lastDay,
        });
        setIsLoading(false);
      })
      .catch(fetchError => {
        if (fetchError.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch semester data:', fetchError);
        setError(fetchError);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { data, isLoading, error };
}
