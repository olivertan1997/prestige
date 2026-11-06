package myapp.controller;

// The role-specific half of GET /api/accounts/{id}.
// It joins THREE tables conceptually: users (who), designer_profile (bio / years /
// specialisation) and company (company_name). Those tables already exist and share the
// user id as PK/FK, so requirement 1 can display and edit a "user profile" without
// creating any new table.
// Null for CUSTOMER, USER_ADMIN and PLATFORM_MANAGEMENT, because the current schema
// has no extra profile table for those roles. Adding one is a clean extension point.
public record AccountProfile(
        String bio,
        Integer yearsExperience,
        String specialisation,
        String companyName
) {}
