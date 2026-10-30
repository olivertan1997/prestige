package myapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import myapp.entity.Availability;
import myapp.entity.AvailabilityRepository;
import myapp.entity.User;
import myapp.entity.UserRepository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// "View Calendar" and "Check Availability".
// Check Availability is INCLUDED in View Calendar: both use statusForRange() below,
// so the calendar and the date checker can never disagree.
@Service
public class AvailabilityService {

    // "Today" must be Singapore's today, even when the server (e.g. on AWS) runs on UTC
    private static final ZoneId SINGAPORE = ZoneId.of("Asia/Singapore");
    private static final int MAX_RANGE_DAYS = 62;

    private final UserRepository userRepository;
    private final AvailabilityRepository availabilityRepository;

    public AvailabilityService(UserRepository userRepository, AvailabilityRepository availabilityRepository) {
        this.userRepository = userRepository;
        this.availabilityRepository = availabilityRepository;
    }

    /** One whole month. If month is blank, the current month is used. Format: 2026-11 */
    @Transactional(readOnly = true)
    public CalendarResponse getCalendar(Integer designerId, String month) {
        User designer = requireActiveDesigner(designerId);
        LocalDate today = LocalDate.now(SINGAPORE);

        YearMonth yearMonth;
        if (month == null || month.isBlank()) {
            yearMonth = YearMonth.from(today);
        } else {
            try {
                yearMonth = YearMonth.parse(month.trim());
            } catch (DateTimeParseException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month must look like 2026-11");
            }
        }

        List<CalendarResponse.Day> days = statusForRange(designerId, yearMonth.atDay(1), yearMonth.atEndOfMonth(), today);
        return new CalendarResponse(designerId, designer.getName(), yearMonth.toString(), today.toString(), days);
    }

    /** One date (leave "to" blank) or a range of dates, e.g. from=2026-11-10 to=2026-11-14 */
    @Transactional(readOnly = true)
    public AvailabilityCheckResponse check(Integer designerId, String fromText, String toText) {
        User designer = requireActiveDesigner(designerId);
        LocalDate today = LocalDate.now(SINGAPORE);

        LocalDate from = parseDate(fromText, "from");
        LocalDate to = (toText == null || toText.isBlank()) ? from : parseDate(toText, "to");

        if (to.isBefore(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'to' must not be before 'from'");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_RANGE_DAYS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Please check at most " + MAX_RANGE_DAYS + " days at a time");
        }

        List<CalendarResponse.Day> days = statusForRange(designerId, from, to, today);
        boolean allAvailable = days.stream().allMatch(d -> "AVAILABLE".equals(d.status()));
        return new AvailabilityCheckResponse(designerId, designer.getName(), from.toString(), to.toString(),
                allAvailable, days);
    }

    // The ONE place that decides what status a date has
    private List<CalendarResponse.Day> statusForRange(Integer designerId, LocalDate from, LocalDate to, LocalDate today) {
        // One query for the whole range, then look each date up in a map
        Map<LocalDate, String> saved = new HashMap<>();
        for (Availability a : availabilityRepository.findByDesignerIdAndAvailabilityDateBetween(designerId, from, to)) {
            saved.put(a.getAvailabilityDate(), a.getStatus());
        }

        List<CalendarResponse.Day> days = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            String status = date.isBefore(today) ? "PAST" : saved.getOrDefault(date, "NOT_SET");
            days.add(new CalendarResponse.Day(date.toString(), status));
        }
        return days;
    }

    private User requireActiveDesigner(Integer designerId) {
        return userRepository.findActiveDesigner(designerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Designer not found"));
    }

    private LocalDate parseDate(String text, String paramName) {
        try {
            return LocalDate.parse(text.trim());
        } catch (DateTimeParseException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, paramName + " must look like 2026-11-12");
        }
    }
}
