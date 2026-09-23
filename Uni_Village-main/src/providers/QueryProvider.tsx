/**
 * Query Provider
 * Setup React Query with default configuration
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: (failureCount, error: any) => {
                if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
                    return false;
                }
                return failureCount < 3;
            },
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: (failureCount, error: any) => {
                if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
                    return false;
                }
                return failureCount < 1;
            },
        },
    },
});

interface QueryProviderProps {
    children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

export { queryClient };
