package myapp.controller;

// The body of POST /api/designers/{id}/projects (create) and
// PUT /api/designers/{id}/projects/{projectId} (edit).
// Plain Strings: ProjectManagementService validates and converts everything itself, so a
// badly-typed budget or date gives a friendly field error instead of crashing the request.
public record ProjectUpsertRequest(
        String title,
        Integer categoryId,
        String description,
        String projectStatus, // "CURRENT" or "COMPLETED"
        String budget,         // e.g. "45000" or "45000.50", optional
        String location,
        String startDate,      // "2026-03-25", optional
        String endDate         // optional
) {}
