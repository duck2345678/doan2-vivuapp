package com.example.vivuapp.service.ChatAndActivity;

import com.example.vivuapp.dto.event.ChatAndActivity.UserPresenceEvent;
import com.example.vivuapp.dto.event.MessageEvent;
import com.example.vivuapp.entity.AccountAndAuthorization.Relationship;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.enums.MessageEventType;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import com.example.vivuapp.service.AccountAndAuthorization.RelationshipService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class PresenceService {

    SimpMessagingTemplate messagingTemplate;
    UserRepository userRepository;
    RelationshipService relationshipService;

    Map<Long, LocalDateTime> onlineUsers = new ConcurrentHashMap<>();

    Map<Long, LocalDateTime> lastHeartbeat = new ConcurrentHashMap<>();

    private static final long HEARTBEAT_TIMEOUT_MS = 60000;

    public void markUserOnline(Long userId) {
        if (userId == null) {
            return;
        }

        boolean wasOffline = !onlineUsers.containsKey(userId);
        onlineUsers.put(userId, LocalDateTime.now());
        lastHeartbeat.put(userId, LocalDateTime.now());

        if (wasOffline) {
            log.info("User {} is now online", userId);
            broadcastPresenceUpdate(userId, true);
        }
    }

    public void markUserOffline(Long userId) {
        if (userId == null) {
            return;
        }

        boolean wasOnline = onlineUsers.containsKey(userId);
        onlineUsers.remove(userId);
        lastHeartbeat.remove(userId);

        if (wasOnline) {
            log.info("User {} is now offline", userId);
            broadcastPresenceUpdate(userId, false);
        }
    }

    public void updateHeartbeat(Long userId) {
        if (userId == null) {
            return;
        }

        lastHeartbeat.put(userId, LocalDateTime.now());
        onlineUsers.put(userId, LocalDateTime.now());
    }

    public boolean isUserOnline(Long userId) {
        if (userId == null) {
            return false;
        }

        LocalDateTime lastBeat = lastHeartbeat.get(userId);
        if (lastBeat == null) {
            return false;
        }

        long millisSinceLastBeat = java.time.Duration.between(lastBeat, LocalDateTime.now()).toMillis();
        if (millisSinceLastBeat > HEARTBEAT_TIMEOUT_MS) {
            markUserOffline(userId);
            return false;
        }

        return true;
    }

    public Map<Long, Boolean> getFriendsPresence(Long userId) {
        Map<Long, Boolean> presence = new HashMap<>();
        
        Slice<Relationship> friendRelationships = relationshipService.getFriends(userId, Pageable.unpaged());

        for (Relationship relationship : friendRelationships) {
            User friend = relationship.getAddressee();
            presence.put(friend.getId(), isUserOnline(friend.getId()));
        }
        
        return presence;
    }

    private void broadcastPresenceUpdate(Long userId, boolean isOnline) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();
        UserPresenceEvent event = UserPresenceEvent.builder()
                .userId(userId)
                .displayName(user.getFirstName() + " " + user.getLastName())
                .isOnline(isOnline)
                .lastSeen(isOnline ? null : LocalDateTime.now())
                .build();

        Slice<Relationship> friendRelationships = relationshipService.getFriends(userId, Pageable.unpaged());

        for (Relationship relationship : friendRelationships) {
            User friend = relationship.getAddressee();
            try {
                messagingTemplate.convertAndSendToUser(
                        friend.getId().toString(),
                        "/queue/presence",
                        new MessageEvent<>(
                                isOnline ? MessageEventType.USER_ONLINE : MessageEventType.USER_OFFLINE,
                                event
                        )
                );
            } catch (Exception e) {
                log.error("Failed to send presence update to user {}: {}", friend.getId(), e.getMessage());
            }
        }

        log.debug("Broadcasted presence update for user {} (online={}) to {} friends", 
                userId, isOnline, friendRelationships.getContent().size());
    }

    public void sendBulkPresenceUpdate(Long userId) {
        Map<Long, Boolean> friendsPresence = getFriendsPresence(userId);
        
        List<UserPresenceEvent> presenceEvents = new ArrayList<>();
        for (Map.Entry<Long, Boolean> entry : friendsPresence.entrySet()) {
            Long friendId = entry.getKey();
            Boolean isOnline = entry.getValue();
            
            Optional<User> friendOpt = userRepository.findById(friendId);
            if (friendOpt.isPresent()) {
                User friend = friendOpt.get();
                presenceEvents.add(UserPresenceEvent.builder()
                        .userId(friendId)
                        .displayName(friend.getFirstName() + " " + friend.getLastName())
                        .isOnline(isOnline)
                        .lastSeen(isOnline ? null : onlineUsers.get(friendId))
                        .build());
            }
        }

        if (!presenceEvents.isEmpty()) {
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/presence",
                    new MessageEvent<>(MessageEventType.BULK_PRESENCE, presenceEvents)
            );
            log.debug("Sent bulk presence update to user {}: {} friends", userId, presenceEvents.size());
        }
    }

    public void cleanupStaleConnections() {
        List<Long> staleUsers = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<Long, LocalDateTime> entry : lastHeartbeat.entrySet()) {
            long millisSinceLastBeat = java.time.Duration.between(entry.getValue(), now).toMillis();
            if (millisSinceLastBeat > HEARTBEAT_TIMEOUT_MS) {
                staleUsers.add(entry.getKey());
            }
        }

        for (Long userId : staleUsers) {
            markUserOffline(userId);
        }

        if (!staleUsers.isEmpty()) {
            log.info("Cleaned up {} stale connections", staleUsers.size());
        }
    }
}
