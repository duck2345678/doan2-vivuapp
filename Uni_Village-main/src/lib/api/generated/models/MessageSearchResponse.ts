/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageType } from './MessageType';
export type MessageSearchResponse = {
    id?: number;
    conversationId?: string;
    conversationName?: string;
    senderId?: number;
    senderName?: string;
    senderAvatar?: string;
    content?: string;
    messageType?: MessageType;
    fileUrls?: Array<string>;
    timestamp?: string;
};

