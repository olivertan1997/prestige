package myapp.controller;

import java.math.BigDecimal;
import java.util.List;

// The JSON shape for ONE project page (project.html).
// Dates are sent as text like "2026-03-25" so the browser never has to guess a format.
public record ProjectDetailResponse(
        Integer id,
        String title,
        String description,
        String status,          // CURRENT or COMPLETED
        BigDecimal budget,      // SGD, can be null
        String startDate,       // can be null
        String endDate,         // can be null
        String location,
        String category,
        List<Image> images,     // cover image first is NOT guaranteed, check "cover"
        Designer designer
) {
    public record Image(String url, String caption, boolean cover) {}

    // profileAvailable is false when the designer is suspended or deleted.
    // In that case we send NO name, so the page cannot show or link to them.
    public record Designer(
            Integer id,
            String name,
            String company,
            String specialisation,
            boolean profileAvailable
    ) {}
}
