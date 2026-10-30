package myapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

// Catches exceptions thrown by ANY controller, so each controller does not need its own
// try/catch. This is the one place that decides what a validation error looks like in JSON.
@RestControllerAdvice
public class GlobalExceptionHandler {

    // A field-by-field validation failure, e.g. from creating or editing a project or company.
    // Response body: {"errors": {"title": "Title is required"}}
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(ValidationException e) {
        return ResponseEntity.badRequest().body(Map.of("errors", e.getFieldErrors()));
    }
}
