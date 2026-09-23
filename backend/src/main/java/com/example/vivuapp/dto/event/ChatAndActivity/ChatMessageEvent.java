package com.example.vivuapp.dto.event.ChatAndActivity;

import com.example.vivuapp.enums.MessageType;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Event containing message data sent to recipient.
 * Sent to /user/queue/messages destination.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatMessageEvent {

    /**
     * Server-generated message ID.
     */
    Long id;

    /**
     * Client-generated message ID for correlation.
     */
    String clientMessageId;

    /**
     * Conversation ID.
     */
    String conversationId;

    /**
     * Sender user ID.
     */
    Long senderId;

    /**
     * Sender display name.
     */
    String senderName;

    /**
     * Sender avatar URL.
     */
    String senderAvatarUrl;

    /**
     * Message content.
     */
    String content;

    /**
     * Message type (TEXT, IMAGE, etc.).
     */
    MessageType messageType;

    /**
     * File URLs if message has attachments.
     */
    List<String> fileUrls;

    /**
     * ID of message being replied to, if any.
     */
    Long replyToId;

    /**
     * Timestamp when message was created.
     */
    LocalDateTime timestamp;

    /**
     * Whether this is a message request (from non-friend).
     * If true, the recipient should see this in "Message Requests" folder.
     */
    boolean isRequest;

    /**
     * Whether this is a new conversation.
     * If true, client should add this conversation to their list.
     */
    boolean isNewConversation;
}
