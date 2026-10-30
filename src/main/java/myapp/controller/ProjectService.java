package myapp.controller;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import myapp.entity.Category;
import myapp.entity.Company;
import myapp.entity.CompanyRepository;
import myapp.entity.DesignerProfile;
import myapp.entity.DesignerProfileRepository;
import myapp.entity.InteriorDesignProject;
import myapp.entity.InteriorDesignProjectRepository;
import myapp.entity.User;
import myapp.entity.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

// The service holds the "business logic", so the controller stays thin.
@Service
public class ProjectService {

    private static final int MAX_KEYWORD_LENGTH = 100; // ignore anything typed beyond this
    private static final int MAX_KEYWORDS = 10;        // max words used in one search
    private static final int MAX_PAGE_SIZE = 50;       // stops someone asking for 1,000,000 rows
    private static final char LIKE_ESCAPE = '!';       // see escapeLike()

    // "Today" must be Singapore's today, even when the server (e.g. on AWS) runs on UTC
    private static final ZoneId SINGAPORE = ZoneId.of("Asia/Singapore");

    private final InteriorDesignProjectRepository projectRepository;
    private final IdpImageRepository imageRepository;
    private final UserRepository userRepository;
    private final DesignerProfileRepository profileRepository;
    private final CompanyRepository companyRepository;

    public ProjectService(InteriorDesignProjectRepository projectRepository,
                          IdpImageRepository imageRepository,
                          UserRepository userRepository,
                          DesignerProfileRepository profileRepository,
                          CompanyRepository companyRepository) {
        this.projectRepository = projectRepository;
        this.imageRepository = imageRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.companyRepository = companyRepository;
    }

    @Transactional(readOnly = true)
    public ProjectSearchResponse search(String keyword, int page, int size) {

        // 1. Clean up what the customer typed
        String cleaned = keyword == null ? "" : keyword.trim();
        if (cleaned.length() > MAX_KEYWORD_LENGTH) {
            cleaned = cleaned.substring(0, MAX_KEYWORD_LENGTH).trim();
        }
        // "hdb   scandinavian" -> ["hdb", "scandinavian"]
        List<String> terms = cleaned.isEmpty()
                ? List.of()
                : Arrays.stream(cleaned.split("\\s+")).limit(MAX_KEYWORDS).toList();

        // 2. Keep paging values in a safe range
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        // Newest projects first. "id" is a tie-breaker so the pages never overlap or skip.
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));

        // 3. Run the search (one query for the rows, one for the total count)
        Page<InteriorDesignProject> result = projectRepository.findAll(matchesAllKeywords(terms), pageable);

        // 4. Convert entities into the JSON shape the page needs
        List<ProjectSearchResponse.Item> items = toItems(result.getContent());

        return new ProjectSearchResponse(cleaned, items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    /**
     * "View Project": everything about ONE project.
     * A project that does not exist, or was soft-deleted, gives a 404 (not found).
     */
    @Transactional(readOnly = true)
    public ProjectDetailResponse getProject(Integer id) {
        InteriorDesignProject p = projectRepository.findById(id)
                .filter(project -> !project.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        List<ProjectDetailResponse.Image> images = imageRepository.findByIdpIdOrderByDisplayOrderAsc(id).stream()
                .map(i -> new ProjectDetailResponse.Image(i.getImageUrl(), i.getCaption(), i.isCover()))
                .toList();

        return new ProjectDetailResponse(
                p.getId(),
                p.getTitle(),
                p.getDescription(),
                p.getProjectStatus(),
                p.getBudget(),
                p.getStartDate() == null ? null : p.getStartDate().toString(),
                p.getEndDate() == null ? null : p.getEndDate().toString(),
                p.getLocation(),
                p.getCategory() == null ? null : p.getCategory().getName(),
                images,
                designerOf(p.getDesignerId()));
    }

    // Only reveal the designer if customers are allowed to see them (ACTIVE and not deleted)
    private ProjectDetailResponse.Designer designerOf(Integer designerId) {
        User designer = userRepository.findActiveDesigner(designerId).orElse(null);
        if (designer == null) {
            return new ProjectDetailResponse.Designer(null, null, null, null, false);
        }
        String company = companyRepository.findByDesignerId(designerId).map(Company::getCompanyName).orElse(null);
        String specialisation = profileRepository.findById(designerId).map(DesignerProfile::getSpecialisation).orElse(null);
        return new ProjectDetailResponse.Designer(designer.getId(), designer.getName(), company, specialisation, true);
    }

    /**
     * "Current vs past" portfolio split ("Interior Designers can manage their portfolio of
     * current and past projects"). This is INDEPENDENT of the project_status column
     * (CURRENT/COMPLETED), which is the designer's own "is the work finished?" flag.
     * Here, a project only becomes PAST once it ended a year ago or more; everything else
     * (still ongoing, no end date yet, or finished less than a year ago) counts as CURRENT.
     */
    public static LocalDate portfolioCutoff() {
        return LocalDate.now(SINGAPORE).minusYears(1);
    }

    public static boolean isPastProject(LocalDate endDate, LocalDate cutoff) {
        return endDate != null && !endDate.isAfter(cutoff);
    }

    /**
     * Turns projects into the card shape used by the search results and by the designer page.
     * The cover images of ALL the projects are loaded with ONE query.
     */
    public List<ProjectSearchResponse.Item> toItems(List<InteriorDesignProject> projects) {
        List<Integer> projectIds = projects.stream().map(InteriorDesignProject::getId).toList();
        Map<Integer, String> coverImages = new HashMap<>();
        if (!projectIds.isEmpty()) {
            for (IdpImage image : imageRepository.findByIdpIdInAndCoverTrue(projectIds)) {
                coverImages.put(image.getIdpId(), image.getImageUrl());
            }
        }
        return projects.stream()
                .map(p -> new ProjectSearchResponse.Item(
                        p.getId(),
                        p.getTitle(),
                        p.getDescription(),
                        p.getProjectStatus(),
                        p.getBudget(),
                        p.getLocation(),
                        p.getCategory() == null ? null : p.getCategory().getName(),
                        coverImages.get(p.getId())))
                .toList();
    }

    /**
     * Builds the WHERE clause:
     *   - the project is not soft-deleted, AND
     *   - EVERY keyword appears in the title OR description OR location OR category name.
     * So "hdb scandinavian" narrows results, and no keyword at all returns every project.
     */
    private Specification<InteriorDesignProject> matchesAllKeywords(List<String> terms) {
        return (root, query, cb) -> {

            // For the data query (not the COUNT query) load the category in the same SQL,
            // so we don't fire one extra query per project to read the category name.
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("category", JoinType.LEFT);
            }
            Join<InteriorDesignProject, Category> category = root.join("category", JoinType.LEFT);

            List<Predicate> conditions = new ArrayList<>();
            conditions.add(cb.isFalse(root.<Boolean>get("deleted"))); // hide soft-deleted projects

            for (String term : terms) {
                String pattern = "%" + escapeLike(term.toLowerCase(Locale.ROOT)) + "%";
                conditions.add(cb.or(
                        cb.like(cb.lower(root.<String>get("title")), pattern, LIKE_ESCAPE),
                        cb.like(cb.lower(root.<String>get("description")), pattern, LIKE_ESCAPE),
                        cb.like(cb.lower(root.<String>get("location")), pattern, LIKE_ESCAPE),
                        cb.like(cb.lower(category.<String>get("name")), pattern, LIKE_ESCAPE)
                ));
            }
            return cb.and(conditions.toArray(new Predicate[0]));
        };
    }

    // In SQL LIKE, "%" and "_" are wildcards. If a customer types "100%" we want to find the
    // literal text "100%", not "100 followed by anything". So we escape them with '!'.
    private static String escapeLike(String text) {
        return text.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
