package myapp.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/company") // All web requests to "/api/company" land here
@CrossOrigin(origins = "*")     // Prevents web security blocks when testing locally
public class CompanyController {

    private final CompanyService companyService;

    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    // GET /api/company  ->  View Company Information (used by both about.html and contact.html)
    @GetMapping
    public CompanyResponse getCompany() {
        return companyService.getCompany();
    }

    // PUT /api/company/profile  ->  Edit Company Information: Company Profile (about.html)
    @PutMapping("/profile")
    public CompanyResponse updateProfile(@RequestBody CompanyProfileRequest request) {
        return companyService.updateProfile(request);
    }

    // PUT /api/company/contact  ->  Edit Company Information: Contact Details (contact.html)
    @PutMapping("/contact")
    public CompanyResponse updateContact(@RequestBody CompanyContactRequest request) {
        return companyService.updateContact(request);
    }
}
