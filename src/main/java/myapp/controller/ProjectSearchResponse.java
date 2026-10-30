package myapp.controller;

import java.math.BigDecimal;
import java.util.List;

// The JSON shape sent back to portfolio.html.
// We use a DTO (data transfer object) instead of returning the entity directly,
// so we only expose the fields the page needs (e.g. never designer_id).
public record ProjectSearchResponse(
        String keyword,        // the cleaned keyword that was actually searched
        List<Item> items,      // the projects on this page
        int page,              // current page number, starts at 0
        int size,              // page size used
        long totalElements,    // total number of matching projects (all pages)
        int totalPages
) {
    public record Item(
            Integer id,
            String title,
            String description,
            String status,         // CURRENT or COMPLETED
            BigDecimal budget,     // SGD, can be null
            String location,
            String category,       // category name, e.g. "HDB - Modern"
            String coverImageUrl   // can be null if the project has no cover image
    ) {}
}
