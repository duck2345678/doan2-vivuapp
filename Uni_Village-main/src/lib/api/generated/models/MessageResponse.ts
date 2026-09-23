/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageType } from './MessageType';
import type { ReadReceiptResponse } from './ReadReceiptResponse';
export type MessageResponse = {
    id?: number;
    senderId?: number;
    conversationId?: string;
    senderName?: string;
    senderAvatarUrl?: string;
    content?: string;
    messageType?: MessageType;
    readBy?: Array<ReadReceiptResponse>;
    isActive?: boolean;
    replyToId?: number;
    timestamp?: string;
};

