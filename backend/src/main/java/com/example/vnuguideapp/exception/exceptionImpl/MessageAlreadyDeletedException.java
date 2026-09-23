package com.example.vnuguideapp.exception.exceptionImpl;

import com.example.vnuguideapp.exception.BaseException;

/**
 * Exception khi cố gắng thao tác trên message đã bị thu hồi/xóa
 */
public class MessageAlreadyDeletedException extends BaseException {

  private static final String ERROR_CODE = "MESSAGE_ALREADY_DELETED";

  public MessageAlreadyDeletedException(String message) {
    super(message, ERROR_CODE);
  }

  public MessageAlreadyDeletedException() {
    super("Message has already been deleted", ERROR_CODE);
  }
}
