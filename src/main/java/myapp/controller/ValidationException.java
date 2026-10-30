package myapp.controller;

import java.util.Map;

// Thrown when the data a customer or designer submitted (a new project, an edited company
// profile, ...) fails our own checks, e.g. a blank title or a negative budget.
// GlobalExceptionHandler turns this into an HTTP 400 response with the field errors below.
public class ValidationException extends RuntimeException {

    // One message per invalid field, e.g. {"title": "Title is required", "budget": "Budget cannot be negative"}
    private final Map<String, String> fieldErrors;

    public ValidationException(Map<String, String> fieldErrors) {
        super("Validation failed: " + fieldErrors);
        this.fieldErrors = fieldErrors;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}
