/**
 * useSearchUsers hook
 * Search users by username or email with 300ms debounce
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { usersApi, type UserSearchResult } from '../api';

/**
 * Query key factory for user search queries
 */
export const searchUsersKeys = {
  all: ['searchUsers'] as const,
  byQuery: (query: string) => [...searchUsersKeys.all, query] as const,
};

/**
 * Hook to debounce a value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Search users by username or email with 300ms debounce
 * @param query - Search query string
 */
export function useSearchUsers(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery<UserSearchResult[], Error>({
    queryKey: searchUsersKeys.byQuery(debouncedQuery),
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }
      const response = await usersApi.searchUsers({ query: debouncedQuery });
      return response.result?.content || [];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });
}
