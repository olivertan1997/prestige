package myapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import myapp.entity.CompanyRepository;
import myapp.entity.DesignerProfile;
import myapp.entity.DesignerProfileRepository;
import myapp.entity.InteriorDesignProject;
import myapp.entity.InteriorDesignProjectRepository;
import myapp.entity.RatingRepository;
import myapp.entity.User;
import myapp.entity.UserRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// "View Interior Designer": a designer's public profile.
@Service
public class DesignerService {

    private final UserRepository userRepository;
    private final DesignerProfileRepository profileRepository;
    private final CompanyRepository companyRepository;
    private final RatingRepository ratingRepository;
    private final InteriorDesignProjectRepository projectRepository;
    private final ProjectService projectService;

    public DesignerService(UserRepository userRepository,
                           DesignerProfileRepository profileRepository,
                           CompanyRepository companyRepository,
                           RatingRepository ratingRepository,
                           InteriorDesignProjectRepository projectRepository,
                           ProjectService projectService) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.companyRepository = companyRepository;
        this.ratingRepository = ratingRepository;
        this.projectRepository = projectRepository;
        this.projectService = projectService;
    }

    // Every designer customers may look at, A to Z. Used by the drop-down on calendar.html.
    @Transactional(readOnly = true)
    public List<DesignerListItem> listDesigners() {
        List<User> designers = userRepository
                .findByRoleAndStatusAndDeletedFalseOrderByNameAsc("INTERIOR_DESIGNER", "ACTIVE");

        // One query for all the profiles, instead of one query per designer
        Map<Integer, DesignerProfile> profiles = profileRepository
                .findAllById(designers.stream().map(User::getId).toList()).stream()
                .collect(Collectors.toMap(DesignerProfile::getId, Function.identity()));

        return designers.stream()
                .map(d -> new DesignerListItem(d.getId(), d.getName(),
                        profiles.containsKey(d.getId()) ? profiles.get(d.getId()).getSpecialisation() : null))
                .toList();
    }

    @Transactional(readOnly = true)
    public DesignerProfileResponse getProfile(Integer designerId) {
        // Suspended, deleted, non-designer and unknown ids all give the same 404
        User designer = userRepository.findActiveDesigner(designerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Designer not found"));

        DesignerProfile profile = profileRepository.findById(designerId).orElse(null);

        DesignerProfileResponse.CompanyInfo company = companyRepository.findByDesignerId(designerId)
                .map(c -> new DesignerProfileResponse.CompanyInfo(c.getCompanyName(), c.getDescription(),
                        c.getAddress(), c.getContactEmail(), c.getContactPhone(), c.getWebsite()))
                .orElse(null);

        // Average rating rounded to 1 decimal place, e.g. 4.3
        Double average = ratingRepository.findAverageScore(designerId);
        Double roundedAverage = average == null ? null : Math.round(average * 10) / 10.0;

        List<InteriorDesignProject> allProjects =
                projectRepository.findByDesignerIdAndDeletedFalseOrderByCreatedAtDescIdDesc(designerId);

        // Split into "current" and "past" by end date (see ProjectService.isPastProject),
        // keeping each project's INSIDE its own group in the same newest-first order.
        LocalDate cutoff = ProjectService.portfolioCutoff();
        List<InteriorDesignProject> current = new ArrayList<>();
        List<InteriorDesignProject> past = new ArrayList<>();
        for (InteriorDesignProject p : allProjects) {
            (ProjectService.isPastProject(p.getEndDate(), cutoff) ? past : current).add(p);
        }

        return new DesignerProfileResponse(
                designer.getId(),
                designer.getName(),
                profile == null ? null : profile.getSpecialisation(),
                profile == null ? null : profile.getYearsExperience(),
                profile == null ? null : profile.getBio(),
                company,
                roundedAverage,
                ratingRepository.countByDesignerId(designerId),
                projectService.toItems(current),
                projectService.toItems(past));
    }
}
