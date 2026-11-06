package myapp.controller;

// Body of PUT /api/accounts/{id}/profile  ->  the INTERIOR_DESIGNER-specific profile
// stored in designer_profile (bio / years_experience / specialisation).
//
// yearsExperience is a String for the same reason as the budget field in the
// teammates' ProjectUpsertRequest: the Service parses it, catches NumberFormatException
// and returns a field error instead of a 500 on bad input.
public record AccountProfileRequest(String bio, String yearsExperience, String specialisation) {}
