package myapp.controller;

import java.util.List;

// The JSON shape when a customer checks one date or a date range.
public record AvailabilityCheckResponse(
        Integer designerId,
        String designerName,
        String from,
        String to,
        boolean allAvailable,              // true only if EVERY date in the range is AVAILABLE
        List<CalendarResponse.Day> days    // the status of each date (same statuses as the calendar)
) {}
