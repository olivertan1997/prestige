package myapp.controller;

import java.util.List;

import myapp.entity.IdpView;
import myapp.entity.IdpViewRepository;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/idps")
public class IdpViewController {

    /** JSON shape returned to the client. */
    public record ViewCount(Integer idpId, Long viewCount) {}

    private final IdpViewRepository repository;

    public IdpViewController(IdpViewRepository repository) {
        this.repository = repository;
    }

    /**
     * Records one view (inserts a row into idp_view) and returns the new total.
     * Call this when someone opens a project's page.
     * 404 if the project doesn't exist or was soft-deleted, so no junk rows are created.
     */
    @PostMapping("/{idpId}/views")
    @ResponseStatus(HttpStatus.CREATED)
    public ViewCount recordView(@PathVariable Integer idpId,
                                @RequestParam(required = false) Integer customerId) {
        if (!repository.projectExists(idpId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }
        repository.save(new IdpView(idpId, customerId)); // customerId is null for visitors who aren't logged in
        return new ViewCount(idpId, repository.countByIdpId(idpId));
    }

    /** View counts for every IDP, most viewed first. */
    @GetMapping("/views/counts")
    public List<ViewCount> allCounts() {
        return repository.countViewsGroupedByIdp().stream()
                .map(r -> new ViewCount(r.getIdpId(), r.getViewCount()))
                .toList();
    }

    /** View count for one IDP. */
    @GetMapping("/{idpId}/views/count")
    public ViewCount count(@PathVariable Integer idpId) {
        return new ViewCount(idpId, repository.countByIdpId(idpId));
    }
}
