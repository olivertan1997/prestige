package myapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// "Interior Designers can manage their portfolio of current and past Interior Design Projects"
// (manage-projects.html). There is no login system yet, so — like calendar.html — the page
// asks which designer you are managing; these endpoints trust whatever designerId they're given.
@RestController
@RequestMapping("/api/designers/{designerId}/projects")
@CrossOrigin(origins = "*") // Prevents web security blocks when testing locally
public class ProjectManagementController {

    private final ProjectManagementService service;

    public ProjectManagementController(ProjectManagementService service) {
        this.service = service;
    }

    // GET /api/designers/28/projects  ->  this designer's own projects, split Current/Past
    @GetMapping
    public DesignerProjectsResponse listProjects(@PathVariable Integer designerId) {
        return service.listProjects(designerId);
    }

    // POST /api/designers/28/projects  ->  add a new project
    @PostMapping
    public ResponseEntity<ProjectManageItem> createProject(@PathVariable Integer designerId,
                                                           @RequestBody ProjectUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createProject(designerId, request));
    }

    // PUT /api/designers/28/projects/49  ->  edit an existing project (must belong to this designer)
    @PutMapping("/{projectId}")
    public ProjectManageItem updateProject(@PathVariable Integer designerId,
                                           @PathVariable Integer projectId,
                                           @RequestBody ProjectUpsertRequest request) {
        return service.updateProject(designerId, projectId, request);
    }

    // DELETE /api/designers/28/projects/49  ->  soft-delete (must belong to this designer)
    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(@PathVariable Integer designerId, @PathVariable Integer projectId) {
        service.deleteProject(designerId, projectId);
        return ResponseEntity.noContent().build();
    }
}
