package com.example.vivuapp.dto.request;

import com.example.vivuapp.enums.Status;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {
  private Status status;
}
