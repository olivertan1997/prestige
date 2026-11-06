package myapp.feature;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {
    private final FeatureSessionAuth auth;
    private final AdminReportService service;
    public AdminReportController(FeatureSessionAuth auth, AdminReportService service) {
        this.auth = auth;
        this.service = service;
    }
    @GetMapping
    public AdminReportService.ReportPage list(@RequestParam(defaultValue = "ALL") String status,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "10") int size,
                                              HttpServletRequest request) {
        auth.requireRole(request, "USER_ADMIN");
        return service.list(status, page, size);
    }
    @GetMapping("/{id}")
    public AdminReportService.ReportItem detail(@PathVariable Integer id, HttpServletRequest request) {
        auth.requireRole(request, "USER_ADMIN");
        return service.get(id);
    }
    @PatchMapping("/{id}/rectify")
    public AdminReportService.ReportItem rectify(@PathVariable Integer id, HttpServletRequest request) {
        Integer admin = auth.requireRole(request, "USER_ADMIN");
        auth.requireCsrf(request);
        return service.rectify(id, admin);
    }
}
