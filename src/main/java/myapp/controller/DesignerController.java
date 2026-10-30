package myapp.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/designers") // All web requests to "/api/designers" land here
@CrossOrigin(origins = "*")       // Prevents web security blocks when testing locally
public class DesignerController {

    private final DesignerService designerService;
    private final AvailabilityService availabilityService;

    public DesignerController(DesignerService designerService, AvailabilityService availabilityService) {
        this.designerService = designerService;
        this.availabilityService = availabilityService;
    }

    // GET /api/designers  ->  all designers (id, name, specialisation) for the drop-down
    @GetMapping
    public List<DesignerListItem> listDesigners() {
        return designerService.listDesigners();
    }

    // GET /api/designers/7  ->  View Interior Designer
    @GetMapping("/{id}")
    public DesignerProfileResponse getDesigner(@PathVariable("id") Integer id) {
        return designerService.getProfile(id);
    }

    // GET /api/designers/7/calendar?month=2026-11  ->  View Calendar (month is optional)
    @GetMapping("/{id}/calendar")
    public CalendarResponse getCalendar(@PathVariable("id") Integer id,
                                        @RequestParam(name = "month", required = false) String month) {
        return availabilityService.getCalendar(id, month);
    }

    // GET /api/designers/7/availability?from=2026-11-10&to=2026-11-14  ->  Check Availability
    // "to" is optional: leave it out to check a single date
    @GetMapping("/{id}/availability")
    public AvailabilityCheckResponse checkAvailability(@PathVariable("id") Integer id,
                                                       @RequestParam(name = "from") String from,
                                                       @RequestParam(name = "to", required = false) String to) {
        return availabilityService.check(id, from, to);
    }
}
