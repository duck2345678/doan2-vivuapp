package com.example.vivuapp.dto.reponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportResponse {
  private Long id;
  private ReporterInfo reporter;
  private TargetInfo target;
  private ViolationInfo violation;
  private String status;
  private String createdAt;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ReporterInfo {
    private String name;
    private String avatar;
    private String time;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class TargetInfo {
    private String type;
    private String title;
    private String subtitle;
    private String contentPreview;
    private String image;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ViolationInfo {
    private String type;
    private String label;
    private String description;
  }
}
