package com.example.vivuapp.dto.reponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
  private long totalUsers;
  private long totalReports;
  private long totalPosts;
  private long totalPlaces;
  private long totalComments;
  private List<PostStatItem> postStats;
  private List<UserGrowthItem> userGrowthStats;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class PostStatItem {
    private String name;
    private long value;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class UserGrowthItem {
    private String name;
    private long value;
  }
}
