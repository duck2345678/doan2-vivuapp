package com.example.vivuapp.dto.request.ChatAndActivity;

import jakarta.validation.constraints.NotEmpty;
import lombok.Builder;

import java.util.List;

@Builder
public record AddChannelMemberRequest(
    @NotEmpty List<Long> userIds) {
}
