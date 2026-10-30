package myapp.controller;

import java.math.BigDecimal;

// One project as shown/edited on manage-projects.html. Unlike ProjectSearchResponse.Item
// (used for public browsing), this carries the raw fields (categoryId, dates) an edit form
// needs to pre-fill itself, plus which portfolio "bucket" it currently falls into.
public record ProjectManageItem(
        Integer id,
        String title,
        Integer categoryId,
        String categoryName,
        String description,
        String projectStatus, // CURRENT or COMPLETED (the designer's own "is it finished?" flag)
        BigDecimal budget,
        String location,
        String startDate,     // ISO text, e.g. "2026-03-25", or null
        String endDate,       // ISO text, or null
        String coverImageUrl, // can be null
        String bucket          // "CURRENT" or "PAST" portfolio bucket (see ProjectService.isPastProject)
) {}
