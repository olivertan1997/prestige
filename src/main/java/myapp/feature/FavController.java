package myapp.feature;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/favourites")
public class FavController {
    private final FeatureSessionAuth auth;
    private final FavService service;
    public FavController(FeatureSessionAuth auth, FavService service) {
        this.auth = auth;
        this.service = service;
    }
    @GetMapping
    public List<FavService.FavouriteItem> list(HttpServletRequest request) {
        return service.list(auth.requireRole(request, "CUSTOMER"));
    }
    @GetMapping("/ids")
    public Set<Integer> ids(HttpServletRequest request) {
        return service.savedIds(auth.requireRole(request, "CUSTOMER"));
    }
    @PutMapping("/{idpId}")
    public ResponseEntity<FavService.SaveResult> save(@PathVariable Integer idpId, HttpServletRequest request) {
        Integer customer = auth.requireRole(request, "CUSTOMER");
        auth.requireCsrf(request);
        FavService.SaveResult result = service.save(customer, idpId);
        return ResponseEntity.status(result.newlyAdded() ? HttpStatus.CREATED : HttpStatus.OK).body(result);
    }
    @DeleteMapping("/{idpId}")
    public ResponseEntity<Void> remove(@PathVariable Integer idpId, HttpServletRequest request) {
        Integer customer = auth.requireRole(request, "CUSTOMER");
        auth.requireCsrf(request);
        service.remove(customer, idpId);
        return ResponseEntity.noContent().build();
    }
}
