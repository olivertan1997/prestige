package myapp.controller;

// JSON shape for GET /api/accounts/{id}, POST (201), PUT and the status/profile/restore
// endpoints. Returning ONE shape from every write endpoint means the browser can reuse
// the same rendering code no matter which button was pressed.
//
// password_hash is absent by construction. The page needs email and phone, so they are
// here; the hash is obtained from a separate read-only store that never SELECTs it.
public record AccountResponse(
        Integer id,
        String name,
        String email,
        String phone,
        String role,
        String status,
        boolean deleted,
        String createdAt,
        String updatedAt,
        AccountProfile profile
) {}
