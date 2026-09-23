package com.example.vnuguideapp.dto.reponse;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UnreadCountResponse {
    private long count;
}
