package myapp.feature;

import myapp.entity.User;
import myapp.entity.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminReportService {
    private final AdminReportRepository reports;
    private final UserRepository users;
    public AdminReportService(AdminReportRepository reports, UserRepository users) {
        this.reports = reports;
        this.users = users;
    }

    public record ReportItem(Integer id, Integer reporterId, String reporterName, String issueType,
                             Integer targetIdpId, Integer targetDesignerId, String title,
                             String description, String status, LocalDateTime createdAt,
                             Integer handledBy, LocalDateTime rectifiedAt) {}
    public record ReportPage(List<ReportItem> items, int page, int size,
                             long totalElements, int totalPages) {}

    @Transactional(readOnly = true)
    public ReportPage list(String status, int page, int size) {
        String selected = status == null ? "ALL" : status.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ALL", "OPEN", "RECTIFIED").contains(selected)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be ALL, OPEN, or RECTIFIED");
        }
        Pageable paging = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<AdminReport> data = "ALL".equals(selected)
                ? reports.findAll(paging) : reports.findByStatus(selected, paging);
        Map<Integer, String> names = names(data.getContent().stream().map(AdminReport::getReporterId).toList());
        List<ReportItem> items = data.getContent().stream().map(r -> toItem(r, names)).toList();
        return new ReportPage(items, data.getNumber(), data.getSize(), data.getTotalElements(), data.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ReportItem get(Integer id) {
        AdminReport report = find(id);
        return toItem(report, names(List.of(report.getReporterId())));
    }

    @Transactional
    public ReportItem rectify(Integer id, Integer adminId) {
        if (id == null || id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid report ID");
        reports.rectifyOpen(id, adminId, LocalDateTime.now(ZoneOffset.UTC));
        // Already-rectified reports retain their ORIGINAL handler and time (idempotent).
        return get(id);
    }

    private AdminReport find(Integer id) {
        return reports.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
    }
    private Map<Integer, String> names(List<Integer> ids) {
        Map<Integer, String> map = new HashMap<>();
        for (User u : users.findAllById(ids)) map.put(u.getId(), u.getName());
        return map;
    }
    private static ReportItem toItem(AdminReport r, Map<Integer, String> names) {
        return new ReportItem(r.getId(), r.getReporterId(),
                names.getOrDefault(r.getReporterId(), "Account #" + r.getReporterId()),
                r.getIssueType(), r.getTargetIdpId(), r.getTargetDesignerId(),
                r.getTitle(), r.getDescription(), r.getStatus(), r.getCreatedAt(),
                r.getHandledBy(), r.getRectifiedAt());
    }
}
