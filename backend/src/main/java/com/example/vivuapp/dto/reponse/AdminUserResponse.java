package com.example.vivuapp.dto.reponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserResponse {
  private String id;
  private String name;
  private String email;
  private String role;
  private String status;
  private String joinedAt;
  private String avatar;
}
