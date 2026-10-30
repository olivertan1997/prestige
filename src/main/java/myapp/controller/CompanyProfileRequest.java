package myapp.controller;

// The body of PUT /api/company/profile  ->  the "Company Profile" half of Edit Company Information.
// A plain record with String fields: we validate everything ourselves in CompanyService,
// so a typo cannot crash the request before we get a chance to show a friendly error.
public record CompanyProfileRequest(String companyName, String description, String logoUrl) {}
