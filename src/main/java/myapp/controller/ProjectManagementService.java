package myapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import myapp.entity.Category;
import myapp.entity.CategoryRepository;
import myapp.entity.InteriorDesignProject;
import myapp.entity.InteriorDesignProjectRepository;
import myapp.entity.User;
import myapp.entity.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// "Interior Designers can manage their portfolio of current and past Interior Design Projects":
// add, edit, delete, and list a designer's OWN projects, split into the Current/Past buckets
// from ProjectService (see ProjectService.isPastProject for what that split means).
@Service
public class ProjectManagementService {

    private static final int MAX_TITLE_LENGTH = 150;
    private static final int MAX_LOCATION_LENGTH = 150;
    private static final int MAX_DESCRIPTION_LENGTH = 5000;

    private final InteriorDesignProjectRepository projectRepository;
    private final CategoryRepository categoryRepository;
    private final IdpImageRepository imageRepository;
    private final UserRepository userRepository;

    public ProjectManagementService(InteriorDesignProjectRepository projectRepository,
                                    CategoryRepository categoryRepository,
                                    IdpImageRepository imageRepository,
                                    UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.categoryRepository = categoryRepository;
        this.imageRepository = imageRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public DesignerProjectsResponse listProjects(Integer designerId) {
        User designer = requireActiveDesigner(designerId);
        List<InteriorDesignProject> all =
                projectRepository.findByDesignerIdAndDeletedFalseOrderByCreatedAtDescIdDesc(designerId);

        LocalDate cutoff = ProjectService.portfolioCutoff();
        List<ProjectManageItem> current = new ArrayList<>();
        List<ProjectManageItem> past = new ArrayList<>();
        for (InteriorDesignProject p : all) {
            (ProjectService.isPastProject(p.getEndDate(), cutoff) ? past : current).add(toManageItem(p));
        }
        return new DesignerProjectsResponse(designerId, designer.getName(), cutoff.toString(), current, past);
    }

    @Transactional
    public ProjectManageItem createProject(Integer designerId, ProjectUpsertRequest request) {
        requireActiveDesigner(designerId);
        Category category = validateAndFindCategory(request);
        Fields f = validateFields(request);

        InteriorDesignProject project = new InteriorDesignProject();
        project.setDesignerId(designerId);
        project.setDeleted(false);
        applyFields(project, category, f);

        InteriorDesignProject saved = projectRepository.save(project);
        // Re-read so created_at/updated_at (set by the database, not by Java) are filled in
        return toManageItem(projectRepository.findById(saved.getId()).orElseThrow());
    }

    @Transactional
    public ProjectManageItem updateProject(Integer designerId, Integer projectId, ProjectUpsertRequest request) {
        requireActiveDesigner(designerId);
        InteriorDesignProject project = findOwnedProject(designerId, projectId);
        Category category = validateAndFindCategory(request);
        Fields f = validateFields(request);

        applyFields(project, category, f);
        InteriorDesignProject saved = projectRepository.save(project);
        return toManageItem(projectRepository.findById(saved.getId()).orElseThrow());
    }

    // A soft delete, same as every other "delete" in this app: the row stays (ratings,
    // enquiries and images point at it), it just stops showing up anywhere.
    @Transactional
    public void deleteProject(Integer designerId, Integer projectId) {
        requireActiveDesigner(designerId);
        InteriorDesignProject project = findOwnedProject(designerId, projectId);
        project.setDeleted(true);
        projectRepository.save(project);
    }

    private InteriorDesignProject findOwnedProject(Integer designerId, Integer projectId) {
        return projectRepository.findByIdAndDesignerIdAndDeletedFalse(projectId, designerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No project " + projectId + " for this designer"));
    }

    private User requireActiveDesigner(Integer designerId) {
        return userRepository.findActiveDesigner(designerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Designer not found"));
    }

    private void applyFields(InteriorDesignProject project, Category category, Fields f) {
        project.setCategory(category);
        project.setTitle(f.title);
        project.setDescription(f.description);
        project.setProjectStatus(f.projectStatus);
        project.setBudget(f.budget);
        project.setLocation(f.location);
        project.setStartDate(f.startDate);
        project.setEndDate(f.endDate);
    }

    private ProjectManageItem toManageItem(InteriorDesignProject p) {
        String cover = imageRepository.findByIdpIdOrderByDisplayOrderAsc(p.getId()).stream()
                .filter(IdpImage::isCover).map(IdpImage::getImageUrl).findFirst().orElse(null);
        LocalDate cutoff = ProjectService.portfolioCutoff();
        return new ProjectManageItem(
                p.getId(), p.getTitle(),
                p.getCategory() == null ? null : p.getCategory().getId(),
                p.getCategory() == null ? null : p.getCategory().getName(),
                p.getDescription(), p.getProjectStatus(), p.getBudget(), p.getLocation(),
                p.getStartDate() == null ? null : p.getStartDate().toString(),
                p.getEndDate() == null ? null : p.getEndDate().toString(),
                cover,
                ProjectService.isPastProject(p.getEndDate(), cutoff) ? "PAST" : "CURRENT");
    }

    private Category validateAndFindCategory(ProjectUpsertRequest request) {
        if (request.categoryId() == null) {
            throw new ValidationException(Map.of("categoryId", "Please choose a category"));
        }
        return categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ValidationException(Map.of("categoryId", "That category does not exist")));
    }

    // Everything EXCEPT the category, parsed and checked. One field error per problem, so the
    // form can show them all at once instead of one at a time.
    private Fields validateFields(ProjectUpsertRequest request) {
        Map<String, String> errors = new HashMap<>();

        String title = trim(request.title());
        if (title.isEmpty()) {
            errors.put("title", "Title is required");
        } else if (title.length() > MAX_TITLE_LENGTH) {
            errors.put("title", "Title must be " + MAX_TITLE_LENGTH + " characters or fewer");
        }

        String description = trim(request.description());
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            errors.put("description", "Description must be " + MAX_DESCRIPTION_LENGTH + " characters or fewer");
        }

        String status = trim(request.projectStatus()).toUpperCase(java.util.Locale.ROOT);
        if (!status.equals("CURRENT") && !status.equals("COMPLETED")) {
            errors.put("projectStatus", "Status must be CURRENT or COMPLETED");
        }

        BigDecimal budget = null;
        String budgetText = trim(request.budget());
        if (!budgetText.isEmpty()) {
            try {
                budget = new BigDecimal(budgetText);
                if (budget.signum() < 0) errors.put("budget", "Budget cannot be negative");
            } catch (NumberFormatException e) {
                errors.put("budget", "Budget must be a number, e.g. 45000");
            }
        }

        String location = trim(request.location());
        if (location.length() > MAX_LOCATION_LENGTH) {
            errors.put("location", "Location must be " + MAX_LOCATION_LENGTH + " characters or fewer");
        }

        LocalDate startDate = parseDate(request.startDate(), "startDate", errors);
        LocalDate endDate = parseDate(request.endDate(), "endDate", errors);
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            errors.put("endDate", "End date cannot be before the start date");
        }

        if (!errors.isEmpty()) throw new ValidationException(errors);

        return new Fields(title, description.isEmpty() ? null : description, status, budget,
                location.isEmpty() ? null : location, startDate, endDate);
    }

    private LocalDate parseDate(String text, String field, Map<String, String> errors) {
        String trimmed = trim(text);
        if (trimmed.isEmpty()) return null;
        try {
            return LocalDate.parse(trimmed);
        } catch (DateTimeParseException e) {
            errors.put(field, "Date must look like 2026-03-25");
            return null;
        }
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    // The validated, ready-to-save values from one create/edit submission
    private record Fields(String title, String description, String projectStatus, BigDecimal budget,
                          String location, LocalDate startDate, LocalDate endDate) {}
}
