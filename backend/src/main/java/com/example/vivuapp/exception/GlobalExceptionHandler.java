package com.example.vivuapp.exception;

import com.example.vivuapp.exception.exceptionImpl.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ErrorResponse> handleResourceNotFound(
                        ResourceNotFoundException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.NOT_FOUND.value())
                                .errorCode(ex.getErrorCode())
                                .error("Not Found")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }

        @ExceptionHandler(EmailAlreadyExistedException.class)
        public ResponseEntity<ErrorResponse> handleEmailAlreadyExisted(
                        EmailAlreadyExistedException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.CONFLICT.value())
                                .errorCode(ex.getErrorCode())
                                .error("Conflict")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.CONFLICT);
        }

        @ExceptionHandler(ForbiddenException.class)
        public ResponseEntity<ErrorResponse> handleForbiddenException(
                        ForbiddenException ex, WebRequest req) {
                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.FORBIDDEN.value())
                                .errorCode(ex.getErrorCode())
                                .error("Forbidden")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
        }

        @ExceptionHandler(PasswordException.class)
        public ResponseEntity<ErrorResponse> handleCurrentPasswordIncorrect(
                        PasswordException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.BAD_REQUEST.value())
                                .errorCode(ex.getErrorCode())
                                .error("Bad Request")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        @ExceptionHandler(DeleteUserException.class)
        public ResponseEntity<ErrorResponse> handleDeleteUserException(
                        DeleteUserException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.BAD_REQUEST.value())
                                .errorCode(ex.getErrorCode())
                                .error("Bad Request")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        @ExceptionHandler(InValidOtpException.class)
        public ResponseEntity<ErrorResponse> handleInValidOtpException(
                        InValidOtpException ex, WebRequest req) {
                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.BAD_REQUEST.value())
                                .errorCode(ex.getErrorCode())
                                .error("Bad Request")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        @ExceptionHandler(BadRequestException.class)
        public ResponseEntity<ErrorResponse> handleBadRequestException(
                        BadRequestException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.BAD_REQUEST.value())
                                .errorCode(ex.getErrorCode())
                                .error("Bad Request")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        @ExceptionHandler(BadCredentialsException.class)
        public ResponseEntity<ErrorResponse> handleCustomBadCredentialsException(
                        BadCredentialsException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.UNAUTHORIZED.value())
                                .errorCode(ex.getErrorCode())
                                .error("Unauthorized")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
        }

        @ExceptionHandler(AccountLockedException.class)
        public ResponseEntity<ErrorResponse> handleAccountLockedException(
                        AccountLockedException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.FORBIDDEN.value())
                                .errorCode(ex.getErrorCode())
                                .error("Forbidden")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
        }

        @ExceptionHandler(ReactionAdreadyExistedException.class)
        public ResponseEntity<ErrorResponse> handleReactionAdreadyExistedException(
                        ReactionAdreadyExistedException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.CONFLICT.value())
                                .errorCode(ex.getErrorCode())
                                .error("Conflict")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.CONFLICT);
        }

        @ExceptionHandler(MessageAlreadyDeletedException.class)
        public ResponseEntity<ErrorResponse> handleMessageAlreadyDeletedException(
                        MessageAlreadyDeletedException ex, WebRequest req) {

                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.GONE.value())
                                .errorCode(ex.getErrorCode())
                                .error("Gone")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.GONE);
        }

        // Handle validation errors
        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<Object> handleValidationExceptions(
                        MethodArgumentNotValidException ex, WebRequest request) {

                List<ValidationError> validationErrors = ex.getBindingResult().getFieldErrors().stream()
                                .map(error -> new ValidationError(error.getField(), error.getDefaultMessage()))
                                .collect(Collectors.toList());

                Map<String, Object> body = new LinkedHashMap<>();
                body.put("status", HttpStatus.BAD_REQUEST.value());
                body.put("error", "Validation Failed");
                body.put("path", request.getDescription(false).replace("uri=", ""));
                body.put("errors", validationErrors);

                return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ErrorResponse> handleGenericException(
                        Exception ex, WebRequest req) {
                ErrorResponse error = ErrorResponse.builder()
                                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                                .errorCode("INTERNAL_SERVER_ERROR")
                                .error("Internal Server Error")
                                .message(ex.getMessage())
                                .path(req.getDescription(false).replace("uri=", ""))
                                .build();
                return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
}
