package com.example.vnuguideapp.dto.request;

import com.example.vnuguideapp.enums.Status;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {
  private Status status;
}
