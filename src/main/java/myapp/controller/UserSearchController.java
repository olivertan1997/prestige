package myapp.controller;

import java.util.List;

import myapp.entity.UserSearch;
import myapp.entity.UserSearchRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@CrossOrigin(origins = "*") // lets pages opened from another host/port (e.g. localhost vs 192.168.56.1) call this API
@RestController
@RequestMapping("/api/users")
public class UserSearchController {

    private static final int MAX_RESULTS = 50;

    /** JSON shape returned to the client. Never includes the password hash. */
    public record UserResult(Integer userId, String name, String email, String phone,
                             String role, String status) {}

    private final UserSearchRepository repository;

    public UserSearchController(UserSearchRepository repository) {
        this.repository = repository;
    }

    /**
     * Search users by name.
     *   GET /api/users/search?name=ann
     *   GET /api/users/search?name=ann&role=CUSTOMER   (role is optional)
     * Case-insensitive "contains" match, A-Z by name, at most 50 results.
     */
    @GetMapping("/search")
    public List<UserResult> search(@RequestParam String name,
                                   @RequestParam(required = false) String role) {
        String term = name.trim();
        if (term.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name must not be blank");
        }

        Pageable limit = PageRequest.of(0, MAX_RESULTS);
        List<UserSearch> found = (role == null || role.isBlank())
                ? repository.findByNameContainingIgnoreCaseAndDeletedFalseOrderByNameAsc(term, limit)
                : repository.findByNameContainingIgnoreCaseAndRoleAndDeletedFalseOrderByNameAsc(
                        term, role.trim().toUpperCase(), limit);

        return found.stream()
                .map(u -> new UserResult(u.getId(), u.getName(), u.getEmail(), u.getPhone(),
                        u.getRole(), u.getStatus()))
                .toList();
    }
}
