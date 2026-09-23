package com.example.vnuguideapp.dto.request.ChatAndActivity;

import com.example.vnuguideapp.enums.ChannelCategory;
import com.example.vnuguideapp.enums.ChannelPrivacy;
import lombok.Builder;

@Builder
public record UpdateChannelRequest(
    String name,
    String description,
    ChannelPrivacy privacy,
    ChannelCategory category,
    Boolean allowSharing) {
}
