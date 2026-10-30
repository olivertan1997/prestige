package myapp.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects") // All web requests to "/api/projects" land here
@CrossOrigin(origins = "*")      // Prevents web security blocks when testing locally
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    // GET /api/projects/search?keyword=hdb scandinavian&page=0&size=9
    // - keyword is optional: leave it out (or blank) to list all projects
    // - page starts at 0, size is how many projects per page
    @GetMapping("/search")
    public ProjectSearchResponse searchProjects(
            @RequestParam(name = "keyword", required = false, defaultValue = "") String keyword,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "9") int size) {

        return projectService.search(keyword, page, size);
    }

    // GET /api/projects/49  ->  View Project (everything about one project)
    // Gives 404 if the project does not exist or was soft-deleted.
    @GetMapping("/{id}")
    public ProjectDetailResponse getProject(@PathVariable("id") Integer id) {
        return projectService.getProject(id);
    }
}
