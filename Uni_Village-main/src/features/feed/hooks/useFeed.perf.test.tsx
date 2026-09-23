import React from 'react';
import { create, act } from 'react-test-renderer';
import { useFeed } from './useFeed';
import { useInfiniteQuery } from '@tanstack/react-query';

// Mock useInfiniteQuery
jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

// Mock feedApi to avoid issues
jest.mock('../api/feedApi', () => ({
  feedApi: {
    getFeed: jest.fn(),
  },
}));

describe('useFeed Performance', () => {
  it('should memoize feedItems transformation', () => {
    const mockData = {
      pages: [
        {
          data: [{ id: '1', content: 'post 1' }],
          pagination: { hasMore: false, page: 0 },
        },
      ],
    };

    // Return the stable object reference
    (useInfiniteQuery as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
      error: null,
    });

    let hookResult: any;
    const TestComponent = ({ trigger }: { trigger: number }) => {
      hookResult = useFeed();
      return null;
    };

    let renderer: any;
    act(() => {
        renderer = create(<TestComponent trigger={0} />);
    });

    const firstFeedItems = hookResult.feedItems;

    // Re-render with a prop change to force the component to re-render
    // Since useInfiniteQuery is mocked to return the SAME object,
    // we expect feedItems to be the SAME object if memoized.
    act(() => {
        renderer.update(<TestComponent trigger={1} />);
    });

    const secondFeedItems = hookResult.feedItems;

    // Without memoization, this should be false (different references)
    // With memoization, this should be true
    expect(firstFeedItems).toBe(secondFeedItems);
  });
});
