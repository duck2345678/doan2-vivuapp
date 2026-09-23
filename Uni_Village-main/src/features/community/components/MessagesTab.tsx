import { Href, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
    CreateChannelModal,
    type CreateChannelModalRef,
} from '@/features/chat/components/CreateChannelModal';
import { useNavigateToChat } from '@/features/chat/hooks';
import { Colors } from '@/shared/constants';
import { useColorScheme, useDebounce } from '@/shared/hooks';
import type { MessagesSubTab } from '../types/message.types';
import { ChannelList } from './ChannelList';
import { InboxList } from './InboxList';
import { MessagesSearchRow } from './MessagesSearchRow';
import { MessagesSubTabs } from './MessagesSubTabs';
import { PlusActionMenu } from './PlusActionMenu';
import { UserSearchResults } from './UserSearchResults';

/**
 * Messages tab content with search, sub-tabs, and lists
 * Matches Figma nodes 204:537 (Inbox) and 204:734 (Channel)
 */
export function MessagesTab() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  // Local state for sub-tab and search
  const [activeSubTab, setActiveSubTab] = useState<MessagesSubTab>('inbox');
  const [searchQuery, setSearchQuery] = useState('');

  // Plus menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  // Create channel modal ref
  const createChannelRef = useRef<CreateChannelModalRef>(null);
  
  // Debounce search for performance
  const debouncedSearch = useDebounce(searchQuery, 300);

  // User navigation hook
  const { handleNavigateToUser } = useNavigateToChat();

  // Check if we should show user search results
  const showUserSearch = searchQuery.trim().length >= 2;

  const handleCreatePress = useCallback((x: number, y: number) => {
    setMenuAnchor({ x, y });
    setMenuVisible(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleAddFriend = useCallback(() => {
    router.push('/friends/add' as Href);
  }, [router]);

  const handleCreateChannel = useCallback(() => {
    createChannelRef.current?.open();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      {/* Search row with create button */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <MessagesSearchRow
          value={searchQuery}
          onChangeText={setSearchQuery}
          onPressCreate={handleCreatePress}
        />
        
        {/* Sub-tabs: Hộp thư / Channel - Hide when searching users */}
        {!showUserSearch && (
          <MessagesSubTabs
            activeTab={activeSubTab}
            onTabChange={setActiveSubTab}
          />
        )}
      </View>

      {/* List content */}
      {showUserSearch ? (
        <UserSearchResults 
          query={searchQuery} 
          onUserSelect={handleNavigateToUser} 
        />
      ) : activeSubTab === 'inbox' ? (
        <InboxList searchQuery="" />
      ) : (
        <ChannelList searchQuery="" />
      )}

      {/* Plus Action Menu */}
      <PlusActionMenu
        visible={menuVisible}
        onClose={handleMenuClose}
        anchorPosition={menuAnchor}
        onAddFriend={handleAddFriend}
        onCreateChannel={handleCreateChannel}
      />

      {/* Create Channel Modal */}
      <CreateChannelModal ref={createChannelRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 4,
  },
});
