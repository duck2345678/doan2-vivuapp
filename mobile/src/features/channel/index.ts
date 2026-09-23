/**
 * Channel Feature Barrel Export
 */

// Screens
export { ChannelInfoScreen } from "./screens";

// Components
export {
    ChannelJoinModal, ShareChannelBottomSheet, type ChannelJoinModalRef, type ShareChannelBottomSheetRef
} from "./components";

// Hooks
export { useChannelInfo, useJoinChannel, useLeaveChannel } from "./hooks";

// Services
export { MOCK_CHANNEL_INFO, channelInfoService } from "./services";

// Types
export type {
    ChannelInfo,
    ChannelInfoResponse,
    ChannelInvite,
    ChannelInvitePayload,
    ChannelMember,
    JoinChannelResponse
} from "./types";

