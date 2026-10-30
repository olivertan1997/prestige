package myapp.controller;

// The body of PUT /api/company/contact  ->  the "Contact Details" half of Edit Company Information.
public record CompanyContactRequest(String address, String contactEmail, String contactPhone, String website) {}
