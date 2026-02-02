import { useState, useEffect } from 'react';

/**
 * Returns the current time, ensuring it matches the client's device time.
 * Handles hydration mismatch by only setting time after mount.
 */
export function useClientTime(updateInterval = 1000) {
    // Start with null to avoid server/client mismatch
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        // Set initial time immediately locally
        setTime(new Date());

        const timer = setInterval(() => {
            setTime(new Date());
        }, updateInterval);

        return () => clearInterval(timer);
    }, [updateInterval]);

    return time;
}
