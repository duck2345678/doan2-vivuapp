# Bolt's Journal

## 2024-05-23 - FlashList Migration
**Learning:** Migrating `InboxList` to `FlashList` was straightforward. Key success factor was calculating `estimatedItemSize` (74px) from `ConversationItem` styles (70px height + 4px margin).
**Action:** Always inspect child component styles to determine precise `estimatedItemSize` for FlashList.
