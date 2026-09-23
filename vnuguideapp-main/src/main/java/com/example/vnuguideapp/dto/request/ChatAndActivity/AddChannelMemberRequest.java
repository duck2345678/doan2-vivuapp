package com.example.vnuguideapp.dto.request.ChatAndActivity;

import jakarta.validation.constraints.NotEmpty;
import lombok.Builder;

import java.util.List;

@Builder
public record AddChannelMemberRequest(
    @NotEmpty List<Long> userIds) {
}
