package myapp.feature;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import myapp.entity.User;
import myapp.entity.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FeatureSessionAuthTest {
    @Test void missingSessionCannotAccessCustomerOrAdminResources() {
        var accounts = mock(FeatureAccountRepository.class);
        var users = mock(UserRepository.class);
        var auth = new FeatureSessionAuth(accounts, users);
        var request = mock(HttpServletRequest.class);
        when(request.getSession(false)).thenReturn(null);
        assertThrows(ResponseStatusException.class, () -> auth.requireRole(request, "CUSTOMER"));
        assertThrows(ResponseStatusException.class, () -> auth.requireRole(request, "USER_ADMIN"));
    }
    @Test void customerCannotReadAdminReportsAndMustPassCsrf() {
        var auth = new FeatureSessionAuth(mock(FeatureAccountRepository.class), fakeUserRepository());
        var request = mock(HttpServletRequest.class);
        var session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("feature.user.id")).thenReturn(106);
        when(session.getAttribute("feature.csrf")).thenReturn("token");
        assertThrows(ResponseStatusException.class, () -> auth.requireRole(request, "USER_ADMIN"));
        assertEquals(106, auth.requireRole(request, "CUSTOMER"));
        assertThrows(ResponseStatusException.class, () -> auth.requireCsrf(request));
        when(request.getHeader("X-CSRF-Token")).thenReturn("token");
        assertDoesNotThrow(() -> auth.requireCsrf(request));
    }
    private UserRepository fakeUserRepository() {
        UserRepository repo = mock(UserRepository.class);
        User customer = new User();
        customer.setId(106);customer.setRole("CUSTOMER");customer.setStatus("ACTIVE");
        when(repo.findById(106)).thenReturn(Optional.of(customer));
        return repo;
    }
}
