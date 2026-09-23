import type { ItineraryShareData } from '../types/itinerary.types';

export const MOCK_ITINERARY_SHARE: ItineraryShareData = {
    id: 'itinerary-001',
    dayLabel: 'Thứ 7',
    date: '07/12',
    stopsCount: 4,
    timeRange: '08:00 - 12:00',
    tags: ['Cà phê', 'Cuối tuần'],
    stops: [
        {
            id: 'stop-1',
            time: '08:00',
            name: 'The Coffee House Premium',
            address: 'Quận 1, TP.HCM',
            note: 'Gặp nhau ở đây.',
            order: 1,
        },
        {
            id: 'stop-2',
            time: '10:30',
            name: 'Highlands Coffee',
            address: 'Bitexco Tower',
            note: 'Ngắm cảnh.',
            order: 2,
        },
        {
            id: 'stop-3',
            time: '11:15',
            name: 'Starbucks Reserve',
            address: 'Hàn Thuyên',
            order: 3,
        },
        {
            id: 'stop-4',
            time: '11:45',
            name: 'Phúc Long',
            address: 'Nguyễn Huệ',
            note: 'Kết thúc tour.',
            order: 4,
        },
    ],
};
