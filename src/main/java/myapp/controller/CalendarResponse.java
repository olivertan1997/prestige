package myapp.controller;

import java.util.List;

// The JSON shape for one month of a designer's calendar (calendar.html).
public record CalendarResponse(
        Integer designerId,
        String designerName,
        String month,       // e.g. "2026-11"
        String today,       // today's date in Singapore, e.g. "2026-10-29"
        List<Day> days      // EVERY day of the month, in order
) {
    // status is one of:
    //   AVAILABLE   - the designer marked this date as free
    //   UNAVAILABLE - the designer marked this date as busy
    //   NOT_SET     - the designer has not said anything about this date yet
    //   PAST        - the date is before today, so it can no longer be booked
    public record Day(String date, String status) {}
}
