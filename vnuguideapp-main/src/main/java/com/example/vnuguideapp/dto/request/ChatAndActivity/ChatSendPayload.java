package com.example.vnuguideapp.dto.request.ChatAndActivity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * WebSocket payload for sending a new message.
 * Sent by client to /app/chat.send endpoint.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatSendPayload {

    /**
     * The recipient user ID for DIRECT messages.
     * For group/channel messages, use conversationId instead.
     */
    @NotNull(message = "Recipient ID is required")
    Long recipientId;

    /**
     * The message content (text).
     */
    @NotBlank(message = "Content cannot be empty")
    String content;

    /**
     * Client-generated message ID for idempotency.
     * If a message with this ID already exists in the conversation,
     * the server will return an ACK without creating a duplicate.
     * Accepts any string format (UUID or custom like "timestamp-randomstring").
     */
    @NotBlank(message = "Client message ID is required")
    String clientMessageId;

    /**
     * Optional: ID of the message being replied to.
     */
    Long replyToId;

    /**
     * Optional: Existing conversation ID (for group/channel messages).
     * If null, server will get/create a DIRECT conversation.
     */
    String conversationId;
}
