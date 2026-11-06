package myapp.entity;

// One GROUP BY bucket from "SELECT role, status, deleted, COUNT(*) FROM users ...".
// The Service folds these rows into AccountSummaryResponse; doing the counting in SQL
// means the 255 seed rows never have to be pulled into Java just to be counted.
public record AccountTallyRow(String role, String status, boolean deleted, long count) {}
