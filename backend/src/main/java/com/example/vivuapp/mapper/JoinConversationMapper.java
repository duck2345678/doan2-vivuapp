package com.example.vivuapp.mapper;

import com.example.vivuapp.dto.reponse.ChatAndActivity.JoinConversationResponse;
import com.example.vivuapp.entity.ChatAndActivity.JoinConversation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface JoinConversationMapper {

    @Mapping(source = "conversation.id", target = "conversationId")
    @Mapping(source = "user.id", target = "userId")
    JoinConversationResponse toResponse(JoinConversation joinConversation);
}
