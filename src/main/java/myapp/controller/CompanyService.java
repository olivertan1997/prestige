package myapp.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import myapp.entity.Company;
import myapp.entity.CompanyRepository;
import myapp.entity.User;
import myapp.entity.UserRepository;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

// "View Company Information" and "Edit Company Information" (Company Profile + Contact Details).
//
// The site does not have a login system yet, so there is no way for a designer to prove which
// company is theirs. Until that exists, about.html and contact.html simply show and edit ONE
// fixed company: the one whose id is in application.properties as app.company.id (we defaulted
// it to company_id=1, "Rahman Interior Design"). Change that one number to manage a different
// company; once logins exist, this id should come from the signed-in designer instead.
@Service
public class CompanyService {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final Integer companyId;

    public CompanyService(CompanyRepository companyRepository,
                          UserRepository userRepository,
                          @Value("${app.company.id}") Integer companyId) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.companyId = companyId;
    }

    @Transactional(readOnly = true)
    public CompanyResponse getCompany() {
        return toResponse(findManagedCompany());
    }

    @Transactional
    public CompanyResponse updateProfile(CompanyProfileRequest request) {
        Company company = findManagedCompany();
        Map<String, String> errors = new HashMap<>();

        String companyName = trim(request.companyName());
        if (companyName.isEmpty()) {
            errors.put("companyName", "Company name is required");
        } else if (companyName.length() > 150) {
            errors.put("companyName", "Company name must be 150 characters or fewer");
        }

        String description = trim(request.description());
        if (description.length() > 2000) {
            errors.put("description", "Description must be 2000 characters or fewer");
        }

        String logoUrl = trim(request.logoUrl());
        if (logoUrl.length() > 500) {
            errors.put("logoUrl", "Logo URL must be 500 characters or fewer");
        }

        if (!errors.isEmpty()) throw new ValidationException(errors);

        company.setCompanyName(companyName);
        company.setDescription(description.isEmpty() ? null : description);
        company.setLogoUrl(logoUrl.isEmpty() ? null : logoUrl);
        return toResponse(companyRepository.save(company));
    }

    @Transactional
    public CompanyResponse updateContact(CompanyContactRequest request) {
        Company company = findManagedCompany();
        Map<String, String> errors = new HashMap<>();

        String address = trim(request.address());
        if (address.length() > 255) {
            errors.put("address", "Address must be 255 characters or fewer");
        }

        String email = trim(request.contactEmail());
        if (!email.isEmpty() && !EMAIL.matcher(email).matches()) {
            errors.put("contactEmail", "Please enter a valid email address, e.g. name@example.com");
        } else if (email.length() > 255) {
            errors.put("contactEmail", "Email must be 255 characters or fewer");
        }

        String phone = trim(request.contactPhone());
        if (phone.length() > 30) {
            errors.put("contactPhone", "Phone number must be 30 characters or fewer");
        }

        String website = trim(request.website());
        if (!website.isEmpty() && !(website.startsWith("http://") || website.startsWith("https://"))) {
            errors.put("website", "Website must start with http:// or https://");
        } else if (website.length() > 255) {
            errors.put("website", "Website must be 255 characters or fewer");
        }

        if (!errors.isEmpty()) throw new ValidationException(errors);

        company.setAddress(address.isEmpty() ? null : address);
        company.setContactEmail(email.isEmpty() ? null : email);
        company.setContactPhone(phone.isEmpty() ? null : phone);
        company.setWebsite(website.isEmpty() ? null : website);
        return toResponse(companyRepository.save(company));
    }

    private Company findManagedCompany() {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No company with id " + companyId + ". Check app.company.id in application.properties."));
    }

    private CompanyResponse toResponse(Company c) {
        String designerName = userRepository.findById(c.getDesignerId()).map(User::getName).orElse(null);
        return new CompanyResponse(c.getId(), c.getDesignerId(), designerName, c.getCompanyName(),
                c.getDescription(), c.getLogoUrl(), c.getAddress(), c.getContactEmail(),
                c.getContactPhone(), c.getWebsite());
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }
}
