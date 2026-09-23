package com.example.vnuguideapp.dto.reponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportTypeResponse {
  private Long id;
  private String code;
  private String name;
  private String description;
}
