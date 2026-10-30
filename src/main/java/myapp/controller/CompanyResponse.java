package myapp.controller;

// The JSON shape for "View Company Information" (about.html and contact.html).
public record CompanyResponse(
        Integer id,
        Integer designerId,
        String designerName,
        String companyName,
        String description,
        String logoUrl,
        String address,
        String contactEmail,
        String contactPhone,
        String website
) {}
