package myapp.feature;

import myapp.controller.ProjectSearchResponse;
import myapp.controller.ProjectService;
import myapp.entity.InteriorDesignProject;
import myapp.entity.InteriorDesignProjectRepository;
import myapp.entity.User;
import myapp.entity.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class FavService {
    private final FavRepository favourites;
    private final InteriorDesignProjectRepository projects;
    private final UserRepository users;
    private final ProjectService projectService;

    public FavService(FavRepository favourites, InteriorDesignProjectRepository projects,
                      UserRepository users, ProjectService projectService) {
        this.favourites = favourites;
        this.projects = projects;
        this.users = users;
        this.projectService = projectService;
    }

    public record FavouriteItem(ProjectSearchResponse.Item project, LocalDateTime savedAt) {}
    public record SaveResult(boolean saved, boolean newlyAdded) {}

    /** Display only public projects, but retain historical favourite rows in the database. */
    @Transactional(readOnly = true)
    public List<FavouriteItem> list(Integer customerId) {
        List<FavRecord> saved = favourites.listByCustomer(customerId);
        if (saved.isEmpty()) return List.of();
        List<Integer> ids = saved.stream().map(f -> f.getId().getIdpId()).toList();
        Map<Integer, InteriorDesignProject> publicProjects = visibleProjects(ids);
        List<InteriorDesignProject> ordered = saved.stream()
                .map(f -> publicProjects.get(f.getId().getIdpId()))
                .filter(p -> p != null).toList();
        Map<Integer, ProjectSearchResponse.Item> cards = new HashMap<>();
        for (ProjectSearchResponse.Item item : projectService.toItems(ordered)) cards.put(item.id(), item);
        return saved.stream().filter(f -> cards.containsKey(f.getId().getIdpId()))
                .map(f -> new FavouriteItem(cards.get(f.getId().getIdpId()), f.getSavedAt())).toList();
    }

    @Transactional(readOnly = true)
    public Set<Integer> savedIds(Integer customerId) {
        return new HashSet<>(list(customerId).stream().map(item -> item.project().id()).toList());
    }

    @Transactional
    public SaveResult save(Integer customerId, Integer idpId) {
        if (idpId == null || idpId <= 0 || !visibleProjects(List.of(idpId)).containsKey(idpId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not available");
        }
        // Atomic, idempotent insert; customer_id + idp_id is a database primary key.
        return new SaveResult(true, favourites.insertIfAbsent(customerId, idpId) == 1);
    }

    @Transactional
    public void remove(Integer customerId, Integer idpId) {
        if (idpId == null || idpId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid project ID");
        }
        // A deleted/hidden project must still be removable from the user's list.
        favourites.deleteById(new FavKey(customerId, idpId));
    }

    private Map<Integer, InteriorDesignProject> visibleProjects(List<Integer> ids) {
        List<InteriorDesignProject> found = projects.findAllById(ids);
        Set<Integer> designerIds = new HashSet<>();
        for (InteriorDesignProject p : found) if (!p.isDeleted()) designerIds.add(p.getDesignerId());
        Map<Integer, User> designers = new HashMap<>();
        for (User u : users.findAllById(designerIds)) designers.put(u.getId(), u);
        Map<Integer, InteriorDesignProject> visible = new HashMap<>();
        for (InteriorDesignProject p : found) {
            User u = designers.get(p.getDesignerId());
            if (!p.isDeleted() && u != null && u.isActiveDesigner()) visible.put(p.getId(), p);
        }
        return visible;
    }
}
