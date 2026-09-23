/**
 * useAsync Hook
 * Execute async function with loading, error, and data states
 */

import { useCallback, useState } from 'react';

interface AsyncState<T> {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
}

interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
    execute: (...args: Args) => Promise<T | null>;
    reset: () => void;
}

export function useAsync<T, Args extends unknown[] = []>(
    asyncFunction: (...args: Args) => Promise<T>
): UseAsyncReturn<T, Args> {
    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        error: null,
        isLoading: false,
    });

    const execute = useCallback(
        async (...args: Args): Promise<T | null> => {
            setState({ data: null, error: null, isLoading: true });

            try {
                const result = await asyncFunction(...args);
                setState({ data: result, error: null, isLoading: false });
                return result;
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error));
                setState({ data: null, error: errorObj, isLoading: false });
                return null;
            }
        },
        [asyncFunction]
    );

    const reset = useCallback(() => {
        setState({ data: null, error: null, isLoading: false });
    }, []);

    return { ...state, execute, reset };
}
