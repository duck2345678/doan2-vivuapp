/**
 * Types for Create Post screen
 */

export type CreatePostTab = "post" | "channel" | "itinerary";

export type ChannelVisibility = "public" | "private";

/**
 * Channel data for selection in bottom sheet
 */
export interface ChannelForSelection {
  id: string;
  name: string;
  emoji?: string;
  description: string;
  memberCount: number;
  postsPerWeek?: number;
  lastActive: string;
  visibility?: ChannelVisibility;
  guidelines?: string;
  isOwner?: boolean;
  avatarUrl?: string;
}

/**
 * Itinerary stop preview for selection card
 */
export interface ItineraryStopPreview {
  id: string;
  time: string;
  name: string;
  thumbnail?: string;
}

/**
 * Itinerary data for selection in bottom sheet
 */
export interface ItineraryForSelection {
  id: string;
  title: string;
  date: string;
  timeRange: string;
  area: string;
  stopsCount: number;
  tags: string[];
  stops: ItineraryStopPreview[];
  isSaved?: boolean;
}

// ========== Mock Data ==========

export const MOCK_MY_CHANNELS: ChannelForSelection[] = [
  {
    id: "ch-1",
    name: "Hội Cà Phê Sài Gòn",
    emoji: "☕",
    description: "Chia sẻ địa điểm cà phê ngon tại Sài Gòn",
    memberCount: 1234,
    postsPerWeek: 45,
    lastActive: "2 giờ trước",
    visibility: "public",
    guidelines:
      "Vui lòng chia sẻ hình ảnh rõ ràng và thông tin địa điểm cụ thể.",
    isOwner: true,
  },
  {
    id: "ch-2",
    name: "Food Hunter VN",
    emoji: "🍜",
    description: "Khám phá ẩm thực đường phố Việt Nam",
    memberCount: 5678,
    postsPerWeek: 120,
    lastActive: "30 phút trước",
    visibility: "public",
    guidelines: "Đánh giá trung thực, không spam quảng cáo.",
    isOwner: true,
  },
];

export const MOCK_JOINED_CHANNELS: ChannelForSelection[] = [
  {
    id: "ch-3",
    name: "Du lịch Việt",
    emoji: "✈️",
    description: "Cộng đồng yêu thích du lịch trong nước",
    memberCount: 9876,
    postsPerWeek: 89,
    lastActive: "1 giờ trước",
    visibility: "public",
    guidelines: "Chia sẻ kinh nghiệm, tips du lịch. Không đăng bài quảng cáo.",
    isOwner: false,
  },
  {
    id: "ch-4",
    name: "Phượt thủ Sài Gòn",
    emoji: "🏍️",
    description: "Nhóm phượt bằng xe máy khu vực miền Nam",
    memberCount: 3456,
    postsPerWeek: 67,
    lastActive: "5 giờ trước",
    visibility: "public",
    isOwner: false,
  },
  {
    id: "ch-5",
    name: "Camping Weekend",
    emoji: "⛺",
    description: "Cắm trại cuối tuần, kết nối thiên nhiên",
    memberCount: 2100,
    postsPerWeek: 23,
    lastActive: "Hôm qua",
    visibility: "private",
    isOwner: false,
  },
];

export const MOCK_MY_ITINERARIES: ItineraryForSelection[] = [
  {
    id: "it-1",
    title: "Cà phê hopping Quận 1",
    date: "15/01/2026",
    timeRange: "08:00 - 17:00",
    area: "Quận 1, TP.HCM",
    stopsCount: 5,
    tags: ["Lịch trình", "Cà phê"],
    stops: [
      { id: "s-1", time: "08:00", name: "The Workshop Coffee" },
      { id: "s-2", time: "10:30", name: "Okkio Caffè" },
      { id: "s-3", time: "13:00", name: "Shin Coffee" },
      { id: "s-4", time: "15:00", name: "L'Usine" },
      { id: "s-5", time: "17:00", name: "Cộng Cà Phê" },
    ],
  },
  {
    id: "it-2",
    title: "Food tour Chợ Lớn",
    date: "20/01/2026",
    timeRange: "10:00 - 20:00",
    area: "Quận 5, TP.HCM",
    stopsCount: 6,
    tags: ["Lịch trình", "Ẩm thực"],
    stops: [
      { id: "s-6", time: "10:00", name: "Phở Hoàng" },
      { id: "s-7", time: "12:00", name: "Hủ tiếu Sa Đéc" },
      { id: "s-8", time: "14:00", name: "Chè Thái Hiền Khánh" },
    ],
  },
];

export const MOCK_SAVED_ITINERARIES: ItineraryForSelection[] = [
  {
    id: "it-3",
    title: "Đà Lạt 3 ngày 2 đêm",
    date: "25/01/2026",
    timeRange: "06:00 - 22:00",
    area: "Đà Lạt, Lâm Đồng",
    stopsCount: 12,
    tags: ["Lịch trình", "Du lịch"],
    stops: [
      { id: "s-9", time: "06:00", name: "Hồ Xuân Hương" },
      { id: "s-10", time: "09:00", name: "Thung lũng Tình Yêu" },
      { id: "s-11", time: "12:00", name: "Nhà thờ Con Gà" },
    ],
    isSaved: true,
  },
  {
    id: "it-4",
    title: "Khám phá Vũng Tàu",
    date: "01/02/2026",
    timeRange: "05:00 - 21:00",
    area: "Vũng Tàu, BR-VT",
    stopsCount: 8,
    tags: ["Lịch trình", "Biển"],
    stops: [
      { id: "s-12", time: "05:00", name: "Bãi Sau" },
      { id: "s-13", time: "08:00", name: "Tượng Chúa Kitô" },
    ],
    isSaved: true,
  },
];
