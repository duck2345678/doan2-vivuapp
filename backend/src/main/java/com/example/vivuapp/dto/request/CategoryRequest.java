package com.example.vivuapp.dto.request;

import lombok.Data;

@Data
public class CategoryRequest {
  private String name;
  private String description;
  private String iconType;
}
