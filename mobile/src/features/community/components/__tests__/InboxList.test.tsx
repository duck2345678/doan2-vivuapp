import React from 'react';
import renderer from 'react-test-renderer';
import { InboxList } from '../InboxList';
import { useConversations } from '../../hooks/useConversations';

// Mock FlashList - initially we are using FlatList, but we prepare the mock for the migration too.
// If using FlatList, we can mock React Native FlatList if needed, but it usually renders fine in test renderer.
// However, since we plan to switch to FlashList, I'll add the mock for FlashList now or I can just mock it when I change it.
// For now, let's just write the test. Since the code currently uses FlatList, we don't need FlashList mock yet.
// But I will add it to be ready.

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    FlashList: (props: any) => {
        return React.createElement(View, { ...props, testID: 'flash-list' },
            props.data?.map((item: any, index: number) =>
                React.createElement(View, { key: index }, props.renderItem({ item, index }))
            )
        );
    },
  };
});

// Mock hooks
jest.mock('../../hooks/useConversations', () => ({
  useConversations: jest.fn(),
}));

jest.mock('@/features/chat/hooks', () => ({
  useDeleteConversation: jest.fn(() => ({
    deleteConversation: { mutateAsync: jest.fn() },
    isDeleting: false,
  })),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('@/shared/hooks', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/features/chat/components', () => ({
  MessageRequestsEntryRow: () => 'MessageRequestsEntryRow',
}));

jest.mock('@/shared/components/ui/ConfirmModal', () => ({
  ConfirmModal: () => 'ConfirmModal',
}));

jest.mock('@/shared/components/ui', () => ({
    Avatar: () => 'Avatar',
    Spinner: () => 'Spinner',
}));
jest.mock('@/shared/components/feedback', () => ({
    EmptyState: () => 'EmptyState',
}));

describe('InboxList', () => {
  it('renders conversations correctly', () => {
     const mockData = {
      data: [
        {
          id: '1',
          participant: { id: 'p1', displayName: 'User 1', avatarUrl: 'url' },
          lastMessage: { content: 'Hello', timestamp: 'now', isRead: true },
          unreadCount: 0,
          timeLabel: '10:00',
        },
      ],
    };

    (useConversations as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockData,
      error: null,
      refetch: jest.fn(),
    });

    const tree = renderer.create(<InboxList searchQuery="" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders loading state', () => {
    (useConversations as jest.Mock).mockReturnValue({
      isLoading: true,
      data: null,
      error: null,
      refetch: jest.fn(),
    });

    const tree = renderer.create(<InboxList searchQuery="" />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
