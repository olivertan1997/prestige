package myapp.feature;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feature-session")
public class FeatureSessionController {
    private final FeatureSessionAuth auth;
    public FeatureSessionController(FeatureSessionAuth auth) { this.auth = auth; }

    @PostMapping("/login")
    public FeatureSessionAuth.SessionInfo login(@RequestBody FeatureSessionAuth.LoginRequest body,
                                                HttpServletRequest request) {
        return auth.login(body.email(), body.password(), request);
    }
    @GetMapping("/me")
    public FeatureSessionAuth.SessionInfo me(HttpServletRequest request) {
        return auth.sessionInfo(request);
    }
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        auth.logout(request);
        return ResponseEntity.noContent().build();
    }
}
