package myapp.controller;

// Body of PUT /api/accounts/{id}/status  ->  "ACTIVE" or "SUSPENDED".
// A separate record (and a separate endpoint) because "suspend" is a reversible state
// change, not an edit of the account's details. Keeping it apart makes the use case
// visible in the sequence diagram and stops an ordinary edit from silently re-activating
// a suspended account.
public record AccountStatusRequest(String status) {}
