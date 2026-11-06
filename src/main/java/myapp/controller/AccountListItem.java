package myapp.controller;

// One row of GET /api/accounts (the account list table).
// A list item is deliberately smaller than AccountResponse: with 255 seed rows, sending
// the full profile of every account would waste bandwidth for data the table never shows.
// Note there is NO password_hash field anywhere in this API.
public record AccountListItem(
        Integer id,
        String name,
        String email,
        String phone,
        String role,
        String status,
        boolean deleted,
        String createdAt
) {}
