/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChannelPrivacy } from './ChannelPrivacy';
import type { ChannelType } from './ChannelType';
export type ChannelCategory = 'TRAVEL' | 'COURSE' | 'FOOD' | 'PHOTOGRAPHY' | 'READING' | 'OTHER';
export type ChannelResponse = {
    id?: number;
    name?: string;
    description?: string;
    privacy?: ChannelPrivacy;
    channelType?: ChannelType;
    category?: ChannelCategory;
    avatarUrl?: string;
    conversationId?: string;
    creatorId?: number;
    memberCount?: number;
    inviteCode?: string;
    allowSharing?: boolean;
    createdAt?: string;
};

