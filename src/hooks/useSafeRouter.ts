'use client';

import { useRouter as useNextRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Safe wrapper around Next.js useRouter that ensures router is never undefined
 * This prevents "Cannot read properties of undefined (reading 'push')" errors
 */
export function useSafeRouter(): AppRouterInstance {
    const router = useNextRouter();

    // If router is undefined (shouldn't happen but does during hydration),
    // return a mock router that does nothing
    if (!router) {
        console.warn('Router is undefined, returning mock router');
        return {
            push: () => Promise.resolve(true),
            replace: () => Promise.resolve(true),
            refresh: () => { },
            prefetch: () => { },
            back: () => { },
            forward: () => { },
        } as AppRouterInstance;
    }

    return router;
}
