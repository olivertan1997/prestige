package myapp.controller;

import java.util.List;

// The JSON shape for ONE designer page (designer.html).
public record DesignerProfileResponse(
        Integer id,
        String name,
        String specialisation,
        Integer yearsExperience,
        String bio,
        CompanyInfo company,                       // can be null
        Double averageRating,                      // 1.0 to 5.0, null if nobody rated yet
        long ratingCount,
        // "Current" and "past" portfolio (see ProjectService.isPastProject): past is a project
        // that ended a year ago or more; current is everything else (ongoing or recently finished).
        List<ProjectSearchResponse.Item> currentProjects,
        List<ProjectSearchResponse.Item> pastProjects
) {
    public record CompanyInfo(
            String name,
            String description,
            String address,
            String contactEmail,
            String contactPhone,
            String website
    ) {}
}
