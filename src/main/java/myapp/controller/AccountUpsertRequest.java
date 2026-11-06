package myapp.controller;

// Body of POST /api/accounts and PUT /api/accounts/{id}.
// One record for both create and edit, exactly like the teammates' ProjectUpsertRequest.
//
// Everything is String on purpose: pom.xml has NO validation starter, so all checks
// happen in AccountService and come back as {"errors": {"field": "message"}}. If a field
// were Integer/Boolean, a non-numeric JSON value would crash during deserialisation
// before the Service ever got the chance to say something friendly.
//
// There is deliberately NO status here (new accounts always start ACTIVE) and NO
// password / password_hash here. Suspending, restoring and credentials are separate
// concerns with separate endpoints; see the code map document.
public record AccountUpsertRequest(String name, String email, String phone, String role) {}
