package myapp.controller;

import java.util.List;

// The JSON shape for "Interior Designers can manage their portfolio of current and past
// projects" (manage-projects.html). Also reused to list a designer's OWN projects for editing.
public record DesignerProjectsResponse(
        Integer designerId,
        String designerName,
        String portfolioCutoff,            // e.g. "2025-10-30" — projects that ended on/before this date are "past"
        List<ProjectManageItem> current,
        List<ProjectManageItem> past
) {}
