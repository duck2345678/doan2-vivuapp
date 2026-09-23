package com.example.vnuguideapp.dto.reponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPostResponse {
  private String id;
  private AuthorInfo author;
  private String content;
  private String contentPreview;
  private String visibility;
  private String createdAt;
  private StatsInfo stats;
  private String[] images;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class AuthorInfo {
    private String name;
    private String avatar;
    private String email;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class StatsInfo {
    private long reactions;
    private long comments;
    private long shares;
  }
}
