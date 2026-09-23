package com.example.vivuapp.dto.request.ChatAndActivity;

import com.example.vivuapp.enums.ChannelCategory;
import com.example.vivuapp.enums.ChannelPrivacy;
import lombok.Builder;

@Builder
public record UpdateChannelRequest(
    String name,
    String description,
    ChannelPrivacy privacy,
    ChannelCategory category,
    Boolean allowSharing) {
}
