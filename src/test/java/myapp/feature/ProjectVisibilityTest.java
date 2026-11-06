package myapp.feature;

import myapp.controller.*;
import myapp.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProjectVisibilityTest {
    @Test void projectDetailsMustBeHiddenWhenDesignerSuspended() {
        var projects = mock(InteriorDesignProjectRepository.class);
        var images = mock(IdpImageRepository.class);
        var users = mock(UserRepository.class);
        var profiles = mock(DesignerProfileRepository.class);
        var companies = mock(CompanyRepository.class);
        var service = new ProjectService(projects, images, users, profiles, companies);
        var project = new InteriorDesignProject();
        project.setId(4);
        project.setDesignerId(17); // suspended designer in the seeded data
        project.setDeleted(false);
        when(projects.findById(4)).thenReturn(Optional.of(project));
        when(users.findActiveDesigner(17)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> service.getProject(4));
        verifyNoInteractions(images);
    }
}
