package myapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// BOUNDARY layer for requirement 1. This class contains NO business rules: it only
// translates HTTP <-> Java and delegates everything to AccountService. That is exactly
// "actors interact only with boundary classes" (复习笔记/04. Advanced UML II.md:466).
//
// House style copied from CompanyController / ProjectManagementController:
// @RestController + @RequestMapping("/api/...") + @CrossOrigin("*"), constructor
// injection, 201 on POST, 204 with no body on DELETE, no try/catch (GlobalExceptionHandler
// already converts ValidationException into 400 {"errors": {...}}).
//
// NOTE (honest limitation, same as the rest of this project): there is NO login system,
// so the server cannot check that the caller is a USER_ADMIN. In a real system these
// endpoints must be protected by Spring Security and the signed-in Principal. Requirement
// 1 delivers the account-management use cases; authentication is the documented next step.
@RestController
@RequestMapping("/api/accounts")
@CrossOrigin(origins = "*")
public class AccountController {

    private final AccountService service;

    public AccountController(AccountService service) {
        this.service = service;
    }

    // A literal path is matched before /{id}, so "/api/accounts/summary" never tries to
    // convert the word "summary" into an Integer id.
    @GetMapping("/summary")
    public AccountSummaryResponse summary() {
        return service.summary();
    }

    // GET /api/accounts?role=INTERIOR_DESIGNER&status=ACTIVE&q=rahman&includeDeleted=false
    @GetMapping
    public List<AccountListItem> list(@RequestParam(required = false) String role,
                                      @RequestParam(required = false) String status,
                                      @RequestParam(required = false) String q,
                                      @RequestParam(defaultValue = "false") boolean includeDeleted) {
        return service.list(role, status, q, includeDeleted);
    }

    @GetMapping("/{id}")
    public AccountResponse get(@PathVariable Integer id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@RequestBody AccountUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public AccountResponse update(@PathVariable Integer id, @RequestBody AccountUpsertRequest request) {
        return service.update(id, request);
    }

    @PutMapping("/{id}/status")
    public AccountResponse changeStatus(@PathVariable Integer id,
                                        @RequestBody AccountStatusRequest request) {
        return service.changeStatus(id, request);
    }

    @PutMapping("/{id}/profile")
    public AccountResponse updateProfile(@PathVariable Integer id,
                                         @RequestBody AccountProfileRequest request) {
        return service.updateProfile(id, request);
    }

    @PutMapping("/{id}/restore")
    public AccountResponse restore(@PathVariable Integer id) {
        return service.restore(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.delete(id);                 // soft delete, never a physical DELETE
        return ResponseEntity.noContent().build();
    }
}
