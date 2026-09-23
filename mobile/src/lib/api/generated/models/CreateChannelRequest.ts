/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChannelPrivacy } from './ChannelPrivacy';
import type { ChannelType } from './ChannelType';
export type CreateChannelRequest = {
    name: string;
    description?: string;
    privacy?: ChannelPrivacy;
    channelType?: ChannelType;
    participantIds?: Array<number>;
};

