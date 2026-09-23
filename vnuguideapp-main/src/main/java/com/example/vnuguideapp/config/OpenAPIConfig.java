package com.example.vnuguideapp.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.annotations.ExternalDocumentation;

@OpenAPIDefinition(info = @Info(title = "VNU Guide API", version = "1.0.0", description = """
                # VNU Guide Backend API

                ## 🚀 Overview
                RESTful API with **WebSocket support** for real-time updates in chat, channels, posts, and comments.

                ## 🔐 Authentication
                - **JWT Bearer Token**: Required for authenticated endpoints
                - Add to request header: `Authorization: Bearer <your_jwt_token>`
                - OAuth2 login: `/oauth2/authorization/google`

                ## 📡 WebSocket Integration

                ### Connection Setup
                ```javascript
                // 1. Connect to WebSocket endpoint
                const socket = new SockJS('http://localhost:8080/ws');
                const stompClient = Stomp.over(socket);

                // 2. Connect with JWT token
                stompClient.connect(
                    { 'Authorization': 'Bearer ' + jwtToken },
                    onConnected,
                    onError
                );
                ```

                ### 📩 Message Event Wrapper
                All WebSocket messages are wrapped in `MessageEvent<T>`:
                ```json
                {
                  "eventType": "SEND|EDIT|UNSEND|CHANNEL_CHANGED|POST_CHANGED|...",
                  "data": { /* Actual payload */ }
                }
                ```

                ### 🔔 Subscription Topics

                #### **Private User Topics** (User-specific notifications)
                ```javascript
                // Message events (sent/delivered/seen)
                stompClient.subscribe('/user/queue/message', handleMessageEvent);

                // Join request notifications (for ADMINs)
                stompClient.subscribe('/user/queue/join-conversation', handleJoinRequest);

                // Typing indicators
                stompClient.subscribe('/user/queue/typing', handleTyping);
                ```

                #### **Conversation Topics** (All participants receive)
                ```javascript
                // Messages in conversation {conversationId}
                stompClient.subscribe('/topic/conversation.{conversationId}', handleMessage);
                // Example: /topic/conversation.abc-123-def

                // Channel updates (name, description, members)
                stompClient.subscribe('/topic/channel.{conversationId}', handleChannelUpdate);
                ```

                #### **Post & Comment Topics** (Public/followers receive)
                ```javascript
                // Comments on post {postId}
                stompClient.subscribe('/topic/post.{postId}.comments', handleComment);

                // Reactions on post {postId}
                stompClient.subscribe('/topic/post.{postId}.reactions', handleReaction);
                ```

                ### 🎯 Event Types by Category

                #### **Messages** (`MessageEventType`)
                | Event Type | Description | Sent to |
                |------------|-------------|---------|
                | `SEND` | New message | `/topic/conversation.{id}` |
                | `EDIT` | Message edited | `/topic/conversation.{id}` |
                | `UNSEND` | Message deleted | `/topic/conversation.{id}` |
                | `SEEN` | Message read | `/user/queue/message` (sender) |
                | `DELIVERED` | Message delivered | `/user/queue/message` (sender) |
                | `TYPING` | User typing | `/user/queue/typing` |

                #### **Channels**
                | Event Type | Description | Sent to |
                |------------|-------------|---------|
                | `CHANNEL_CHANGED` | Channel info updated | `/topic/channel.{conversationId}` |
                | `SEND_JOIN_REQUEST` | New join request | `/user/queue/join-conversation` (admins) |
                | `ACCEPT_JOIN_REQUEST` | Request accepted | `/user/queue/join-conversation` (requester) |
                | `REJECT_JOIN_REQUEST` | Request rejected | `/user/queue/join-conversation` (requester) |

                #### **Posts & Comments**
                | Event Type | Description | Sent to |
                |------------|-------------|---------|
                | `POST_CHANGED` | Post updated | Followers |
                | `COMMENT_CHANGED` | New/edit comment | `/topic/post.{id}.comments` |
                | `REACTION_CHANGED` | Reaction added/removed | `/topic/post.{id}.reactions` |

                ### 🛠️ Example Implementation

                #### Receive & Handle Messages
                ```javascript
                function handleMessage(payload) {
                  const messageEvent = JSON.parse(payload.body);

                  switch(messageEvent.eventType) {
                    case 'SEND':
                      addMessageToUI(messageEvent.data);
                      break;
                    case 'EDIT':
                      updateMessageInUI(messageEvent.data);
                      break;
                    case 'UNSEND':
                      removeMessageFromUI(messageEvent.data);
                      break;
                  }
                }
                ```

                #### Send Typing Indicator
                ```javascript
                stompClient.send("/app/typing", {}, JSON.stringify({
                  conversationId: "abc-123",
                  isTyping: true
                }));
                ```

                ### 📚 Key API Workflows

                #### **1. Join Private Channel**
                ```
                POST /api/v1/conversations/join/{conversationId}
                → Creates join request with status=PENDING
                → WebSocket: Notifies ADMINs via /user/queue/join-conversation
                → ADMIN accepts: PATCH /api/v1/conversations/join/accept/{requestId}
                → WebSocket: Notifies requester via /user/queue/join-conversation
                → User becomes participant, subscribes to /topic/conversation.{id}
                ```

                #### **2. Send Message**
                ```
                POST /api/v1/messages/send
                → Saves message to DB
                → WebSocket: Broadcasts MessageEvent(SEND) to /topic/conversation.{id}
                → All participants receive real-time update
                ```

                #### **3. Update Channel**
                ```
                PATCH /api/v1/channels/{id}
                → Requires ADMIN role
                → Updates name/description/avatar
                → WebSocket: Broadcasts MessageEvent(CHANNEL_CHANGED) to /topic/channel.{conversationId}
                → All members see updated channel info
                ```

                #### **4. React to Post**
                ```
                POST /api/v1/reactions/post/{postId}
                → Adds reaction to DB
                → WebSocket: Broadcasts to /topic/post.{postId}.reactions
                → Updates reaction count in real-time
                ```

                ### ⚠️ Important Notes
                - **JWT Required**: Include token in STOMP headers for WebSocket connection
                - **Auto-reconnect**: Implement reconnection logic for network issues
                - **Topic Cleanup**: Unsubscribe when leaving conversations/posts
                - **Message Ordering**: Messages use sequence IDs for correct ordering

                ### 🔗 Additional Resources
                - WebSocket Config: `/ws` endpoint with SockJS + STOMP
                - CORS: Configured for frontend origins
                - Rate Limiting: Applied to prevent spam
                """, contact = @Contact(name = "VNU Guide Team", email = "support@vnuguide.com")),

                servers = {
                                @Server(description = "Local Development Server", url = "http://localhost:8080"),
                                @Server(description = "Production Server", url = "https://api.vnug uide.com")
                },

                externalDocs = @ExternalDocumentation(description = "WebSocket Integration Guide", url = "https://docs.vnuguide.com/websocket"))
@SecurityScheme(name = "bearerAuth", description = "JWT authentication - obtain token from /api/v1/auth/login or OAuth2 flow", scheme = "bearer", type = SecuritySchemeType.HTTP, bearerFormat = "JWT", in = SecuritySchemeIn.HEADER)
public class OpenAPIConfig {
}
