package myapp.controller;

import java.util.List;

import myapp.entity.ShortlistRepository;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/idps")
public class ShortlistCountController {

    /** JSON shape returned to the client. */
    public record ShortlistCount(Integer idpId, Long shortlistCount) {}

    private final ShortlistRepository repository;

    public ShortlistCountController(ShortlistRepository repository) {
        this.repository = repository;
    }

    /** Shortlist counts for every IDP that has been shortlisted, most shortlisted first. */
    @GetMapping("/shortlists/counts")
    public List<ShortlistCount> allCounts() {
        return repository.countShortlistsGroupedByIdp().stream()
                .map(r -> new ShortlistCount(r.getIdpId(), r.getShortlistCount()))
                .toList();
    }

    /** Shortlist count for one IDP. */
    @GetMapping("/{idpId}/shortlist/count")
    public ShortlistCount count(@PathVariable Integer idpId) {
        return new ShortlistCount(idpId, repository.countByIdpId(idpId));
    }
}
