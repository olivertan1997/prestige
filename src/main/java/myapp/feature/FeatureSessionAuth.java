package myapp.feature;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import myapp.entity.User;
import myapp.entity.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Isolated, server-side login for Fav + Admin Report features until the team-wide
 * authentication module is merged. Never accepts a customer/admin id from the browser.
 * State-changing operations also require a session CSRF token.
 */
@Service
public class FeatureSessionAuth {
    private static final String USER_KEY = "feature.user.id";
    private static final String CSRF_KEY = "feature.csrf";
    private final FeatureAccountRepository accounts;
    private final UserRepository users;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public FeatureSessionAuth(FeatureAccountRepository accounts, UserRepository users) {
        this.accounts = accounts;
        this.users = users;
    }

    public SessionInfo login(String email, String password, HttpServletRequest request) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }
        FeatureAccount account = accounts.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!account.canSignIn() || !passwords.matches(password, account.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        // Rotate the session ID on login (session-fixation protection).
        HttpSession session = request.getSession(false);
        if (session == null) session = request.getSession(true);
        else request.changeSessionId();
        session.setMaxInactiveInterval(30 * 60);
        session.setAttribute(USER_KEY, account.getId());
        byte[] token = new byte[32];
        random.nextBytes(token);
        session.setAttribute(CSRF_KEY, Base64.getUrlEncoder().withoutPadding().encodeToString(token));
        return sessionInfo(request);
    }

    public SessionInfo sessionInfo(HttpServletRequest request) {
        User user = requireLogin(request);
        return new SessionInfo(user.getId(), user.getName(), user.getRole(),
                (String) request.getSession(false).getAttribute(CSRF_KEY));
    }

    public Integer requireRole(HttpServletRequest request, String expectedRole) {
        User user = requireLogin(request);
        if (!expectedRole.equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This role cannot access the resource");
        }
        return user.getId();
    }

    private User requireLogin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute(USER_KEY) instanceof Integer id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in");
        }
        return users.findById(id).filter(u -> !u.isDeleted() && "ACTIVE".equals(u.getStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable"));
    }

    public void requireCsrf(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        String expected = session == null ? null : (String) session.getAttribute(CSRF_KEY);
        String actual = request.getHeader("X-CSRF-Token");
        if (expected == null || actual == null ||
                !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                        actual.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid CSRF token");
        }
    }

    public void logout(HttpServletRequest request) {
        requireLogin(request);
        requireCsrf(request);
        request.getSession(false).invalidate();
    }

    public record SessionInfo(Integer userId, String name, String role, String csrfToken) {}
    public record LoginRequest(String email, String password) {}
}
