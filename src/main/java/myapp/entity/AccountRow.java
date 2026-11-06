package myapp.entity;

import java.time.LocalDateTime;

// One row of "users" LEFT JOINed to the two role-specific profile tables.
//
// This is an ENTITY-layer row object. It may hold email / phone because an account
// management page needs them, but it has NO password_hash field at all. The SELECT in
// AccountStore lists every column by hand instead of using "SELECT *" for exactly that
// reason: a column you never select can never be serialised into a JSON response.
//
// user_id is both the PK of users and the shared PK/FK of designer_profile, so the joins
// can never multiply rows (see usersDB.sql / designer_profileDB.sql / companyDB.sql).
public record AccountRow(
        Integer id,
        String name,
        String email,
        String phone,
        String role,
        String status,
        boolean deleted,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String bio,
        Integer yearsExperience,
        String specialisation,
        String companyName
) {}
