package com.example.vivuapp.dto.request.ChatAndActivity;

import com.example.vivuapp.enums.ChannelCategory;
import com.example.vivuapp.enums.ChannelPrivacy;
import com.example.vivuapp.enums.ChannelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.util.List;

@Builder
public record CreateChannelRequest(
        @NotBlank @Size(max = 100) String name,
        String description,
        ChannelPrivacy privacy,
        ChannelType channelType,
        ChannelCategory category,
        Boolean allowSharing,
        List<Long> participantIds // Optional initial members
) {
}
