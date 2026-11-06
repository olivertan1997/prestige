package myapp.feature;

import myapp.controller.ProjectSearchResponse;
import myapp.controller.ProjectService;
import myapp.entity.InteriorDesignProject;
import myapp.entity.InteriorDesignProjectRepository;
import myapp.entity.User;
import myapp.entity.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class FavServiceTest {
    FavRepository favs;
    InteriorDesignProjectRepository projects;
    UserRepository users;
    ProjectService projectService;
    FavService service;

    @BeforeEach void setUp() {
        favs = mock(FavRepository.class);
        projects = mock(InteriorDesignProjectRepository.class);
        users = mock(UserRepository.class);
        projectService = mock(ProjectService.class);
        service = new FavService(favs, projects, users, projectService);
    }

    private InteriorDesignProject project(int id, int designerId, boolean deleted) {
        InteriorDesignProject p = new InteriorDesignProject();
        p.setId(id); p.setDesignerId(designerId); p.setTitle("Modern Studio"); p.setDeleted(deleted);
        return p;
    }
    private User designer(int id, String status) {
        User u = new User();
        u.setId(id); u.setRole("INTERIOR_DESIGNER"); u.setStatus(status); u.setDeleted(false);
        return u;
    }

    @Test void saveIsIdempotentAndDoesNotDuplicate() {
        when(projects.findAllById(List.of(77))).thenReturn(List.of(project(77, 6, false)));
        when(users.findAllById(any())).thenReturn(List.of(designer(6, "ACTIVE")));
        when(favs.insertIfAbsent(106, 77)).thenReturn(1, 0);
        assertTrue(service.save(106, 77).newlyAdded());
        assertFalse(service.save(106, 77).newlyAdded());
        verify(favs, times(2)).insertIfAbsent(106, 77);
    }

    @Test void cannotSaveDeletedOrSuspendedDesignersProjects() {
        when(projects.findAllById(List.of(1))).thenReturn(List.of(project(1, 6, true)));
        when(projects.findAllById(List.of(2))).thenReturn(List.of(project(2, 6, false)));
        when(users.findAllById(any())).thenReturn(List.of(designer(6, "SUSPENDED")));
        assertThrows(ResponseStatusException.class, () -> service.save(106, 1));
        assertThrows(ResponseStatusException.class, () -> service.save(106, 2));
        verify(favs, never()).insertIfAbsent(anyInt(), anyInt());
    }

    @Test void canRemoveEvenWhenProjectIsNoLongerVisible() {
        service.remove(106, 77);
        verify(favs).deleteById(new FavKey(106, 77));
        verifyNoInteractions(projects, users);
    }

    @Test void listHidesDeletedProjectsWithoutRemovingSavedRows() {
        FavRecord good = mock(FavRecord.class);
        FavRecord hidden = mock(FavRecord.class);
        when(good.getId()).thenReturn(new FavKey(106, 2));
        when(hidden.getId()).thenReturn(new FavKey(106, 3));
        when(good.getSavedAt()).thenReturn(LocalDateTime.of(2026, 10, 1, 12, 0));
        when(favs.listByCustomer(106))
                .thenReturn(List.of(good, hidden));
        when(projects.findAllById(List.of(2, 3)))
                .thenReturn(List.of(project(2, 6, false), project(3, 6, true)));
        when(users.findAllById(any())).thenReturn(List.of(designer(6, "ACTIVE")));
        when(projectService.toItems(any())).thenReturn(List.of(new ProjectSearchResponse.Item(
                2, "Modern Studio", null, "COMPLETED", new BigDecimal("123"), null, null, null)));
        var items = service.list(106);
        assertEquals(1, items.size());
        assertEquals(2, items.get(0).project().id());
        verify(favs, never()).deleteById(any());
    }
}
