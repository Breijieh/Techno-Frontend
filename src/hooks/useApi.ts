'use client';

// React Hook for API calls with loading and error states

import { useState, useCallback, useEffect, useRef } from 'react';
import { ApiError } from '@/lib/api/client';
import { translations } from '@/lib/translations/ar';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | void>;
  reset: () => void;
}

/**
 * Hook for making API calls with loading and error state management
 */
export function useApi<T>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options?: { immediate?: boolean; onSuccess?: (data: T) => void; onError?: (error: string) => void }
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // Use refs to store callbacks to avoid recreating execute on every render
  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);

  // Update refs when options change
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
    onErrorRef.current = options?.onError;
  }, [options?.onSuccess, options?.onError]);

  // Track if immediate call has been made to prevent duplicate calls
  const immediateCalledRef = useRef(false);
  const executeRef = useRef<((...args: unknown[]) => Promise<T | void>) | null>(null);
  const apiFunctionRef = useRef(apiFunction);

  // Update apiFunction ref when it changes
  useEffect(() => {
    apiFunctionRef.current = apiFunction;
    // Reset immediateCalledRef when apiFunction changes
    immediateCalledRef.current = false;
  }, [apiFunction]);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await apiFunctionRef.current(...args);
        setState({ data, loading: false, error: null });

        if (onSuccessRef.current) {
          onSuccessRef.current(data);
        }

        return data;
      } catch (error) {
        let errorMessage = translations.messages.anErrorOccurred;

        if (error instanceof ApiError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));

        if (onErrorRef.current) {
          onErrorRef.current(errorMessage);
        }

        throw error;
      }
    },
    [] // Empty deps - function is stable, uses ref for current apiFunction
  );

  // Store execute in ref for immediate execution
  useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  // Handle immediate execution - only depend on immediate option, not execute
  useEffect(() => {
    if (options?.immediate && !immediateCalledRef.current && executeRef.current) {
      immediateCalledRef.current = true;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        executeRef.current?.();
      }, 0);
    }
  }, [options?.immediate]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
    immediateCalledRef.current = false;
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for making API calls that return arrays
 */
export function useApiList<T>(
  apiFunction: (...args: unknown[]) => Promise<T[]>,
  options?: { immediate?: boolean; onSuccess?: (data: T[]) => void; onError?: (error: string) => void }
): UseApiReturn<T[]> {
  return useApi(apiFunction, options);
}

