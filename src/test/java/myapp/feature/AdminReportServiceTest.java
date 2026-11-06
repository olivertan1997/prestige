package myapp.feature;

import myapp.entity.User;
import myapp.entity.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminReportServiceTest {
    AdminReportRepository reports;
    UserRepository users;
    AdminReportService service;
    @BeforeEach void setUp() {
        reports = mock(AdminReportRepository.class);
        users = mock(UserRepository.class);
        service = new AdminReportService(reports, users);
    }
    @Test void acceptsOnlySchemaStatuses() {
        assertThrows(ResponseStatusException.class, () -> service.list("PENDING", 0, 10));
        verifyNoInteractions(reports);
    }
    @Test void listsReportsWithReporterNamesWithoutExposingPassword() {
        AdminReport r = mock(AdminReport.class);
        when(r.getReporterId()).thenReturn(106);
        when(r.getId()).thenReturn(12);
        when(r.getStatus()).thenReturn("OPEN");
        when(reports.findByStatus(eq("OPEN"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(r)));
        User reporter = new User(); reporter.setId(106); reporter.setName("Ryan Koh");
        when(users.findAllById(List.of(106))).thenReturn(List.of(reporter));
        var data = service.list("open", 0, 10);
        assertEquals(1, data.items().size());
        assertEquals("Ryan Koh", data.items().get(0).reporterName());
        assertEquals("OPEN", data.items().get(0).status());
    }
    @Test void rectifyingAlreadyResolvedReportNeverOverwritesHandler() {
        AdminReport existing = mock(AdminReport.class);
        when(existing.getId()).thenReturn(4);
        when(existing.getReporterId()).thenReturn(106);
        when(existing.getHandledBy()).thenReturn(2);
        when(existing.getStatus()).thenReturn("RECTIFIED");
        when(reports.rectifyOpen(eq(4), eq(1), any(LocalDateTime.class))).thenReturn(0);
        when(reports.findById(4)).thenReturn(Optional.of(existing));
        when(users.findAllById(List.of(106))).thenReturn(List.of());
        var result=service.rectify(4, 1);
        assertEquals(2, result.handledBy());
        assertEquals("RECTIFIED", result.status());
        verify(reports).rectifyOpen(eq(4), eq(1), any(LocalDateTime.class));
    }
    @Test void nonexistentReportReturnsNotFound() {
        when(reports.findById(999)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> service.rectify(999, 1));
    }
}
