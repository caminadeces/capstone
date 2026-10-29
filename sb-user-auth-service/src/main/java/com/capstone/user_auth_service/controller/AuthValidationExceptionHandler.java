package com.capstone.user_auth_service.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.ArrayList;
import java.util.Map;
import java.util.Objects;

@RestControllerAdvice
public class AuthValidationExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationErrors(MethodArgumentNotValidException exception) {
        var errors = new ArrayList<Map<String, String>>();
        exception.getBindingResult().getFieldErrors().forEach(error -> errors.add(Map.of(
                "field", error.getField(),
                "message", Objects.toString(error.getDefaultMessage(), "Invalid value."))));
        exception.getBindingResult().getGlobalErrors().forEach(error -> errors.add(Map.of(
                "field", error.getObjectName(),
                "message", Objects.toString(error.getDefaultMessage(), "Invalid value."))));

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Please correct the following details.");
        problem.setTitle("Validation failed");
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }
}
