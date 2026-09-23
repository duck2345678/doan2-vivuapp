export * from "@/lib/api/generated";

export type {
  AuthenticationRequest,
  AuthenticationResponse,
  ChangePasswordRequest,
  ForgetPasswordRequest,
  RegisterRequest,
  VerifyRequest,
} from "@/lib/api/generated";

export type {
  AreaRequest,
  AreaResponse,
  DistrictResponse,
  PersonalPinRequest,
  PersonalPinResponse,
  PlaceRequest,
  PlaceResponse,
  PlaceStatus,
  PlaceStatusRequest,
  PlaceSuggestionRequest,
  PlaceSuggestionResponse,
  PlaceSuggestionReviewRequest,
  PlaceSuggestionStatus,
  PlaceTypeRequest,
  PlaceTypeResponse,
  ProvinceResponse,
  WardResponse,
} from "@/lib/api/generated";

export type {
  CheckInRequest,
  CheckInResponse,
  TourRequest,
  TourResponse,
  TourShareRequest,
  TourStatus,
  TourStopReorderRequest,
  TourStopRequest,
  TourStopResponse,
} from "@/lib/api/generated";

export type {
  CommentRequest,
  CommentResponse,
  LikeResponse,
  PostResponse,
  SavedPostResponse,
  SharePostRequest,
  SharePostResponse,
} from "@/lib/api/generated";

// Export PostType and Visibility as values (enums), not just types
export { PostType, Visibility } from "@/lib/api/generated";

export type {
  ConversationPrivateRequest,
  ConversationResponse,
  FileMessageResponse,
  FileType,
  MarkReadRequest,
  MediaAttachmentResponse,
  MessageRequest,
  MessageResponse,
  MessageSearchResponse,
  ReadReceiptResponse,
} from "@/lib/api/generated";

// Export MessageType as value (enum), not just type
export { MessageType } from "@/lib/api/generated";

export type {
  AddChannelMemberRequest,
  ChannelMemberResponse,
  ChannelPrivacy,
  ChannelResponse,
  ChannelType,
  CreateChannelRequest,
  JoinConversationResponse,
  JoinRequestStatus,
  ParticipantRole,
  UpdateChannelRequest,
} from "@/lib/api/generated";

export type {
  ItinerarySuggestRequest,
  SuggestedItinerary,
  SuggestedStop,
} from "@/lib/api/generated";

export type {
  ApiResponseAuthenticationResponse,
  ApiResponseBase,
  ApiResponseString,
  ApiResponseVoid,
} from "@/lib/api/generated";

export type {
  PageCheckInResponse,
  PagePersonalPinResponse,
  PagePlaceResponse,
  PagePlaceSuggestionResponse,
  PageTourResponse,
  Pageable,
  SliceCommentResponse,
  SliceConversationResponse,
  SliceMessageResponse,
  SliceMessageSearchResponse,
  SlicePostResponse,
  Sort,
} from "@/lib/api/generated";
