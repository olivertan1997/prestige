# UAT round v1

- **Tested:** 2026-11-07
- **Saved:** 2026-11-07 08:30 UTC from `completed UAT.txt`
- **Website:** https://prestige-interior.olivertan1997.workers.dev
- **Checklist:** round v1 edition of the UAT checklist (56 test cases)

| Result | Tests |
| --- | --- |
| Pass | 55 |
| Fail | 1 |
| Blocked | 0 |
| Not run | 0 |
| **Total** | **56** |

**Pass rate:** 98% of the 56 tests run.

## Failed (1)

| ID | Test | Notes | Tested by | Tested at |
| --- | --- | --- | --- | --- |
| B-05 | Add a past project | In the timeline, I see "Nov 2026 – Nov 2026". But I entered start date: 1 Nov 2026 and end date: 7 Nov 2026. I need these date to reflect the exact dates that I entered. | - | 2026-11-07 06:51 |

## Blocked (0)

None.

## Not run (0)

None.

## Requirement coverage

| Requirement | What it covers | Tests | Status |
| --- | --- | --- | --- |
| Spec 1 | Manage user accounts and user profiles | A-01 (Pass), A-02 (Pass), A-03 (Pass), A-04 (Pass), A-05 (Pass), A-06 (Pass), A-07 (Pass), D-01 (Pass), D-02 (Pass), D-03 (Pass), D-04 (Pass), D-05 (Pass) | Passed |
| Spec 2 | Interior Designers manage their company information | B-01 (Pass), B-02 (Pass), B-03 (Pass) | Passed |
| Spec 3 | Interior Designers manage a portfolio of current and past projects | B-04 (Pass), B-05 (Fail), B-06 (Pass), B-07 (Pass), B-08 (Pass) | Failing |
| Spec 4 | Customers search, view and save projects | C-01 (Pass), C-02 (Pass), C-03 (Pass), C-04 (Pass), C-10 (Pass) | Passed |
| Spec 5 | Interior Designers track views and shortlists | B-12 (Pass), B-13 (Pass) | Passed |
| Spec 6 | Platform Management manages categories and gets reports | E-01 (Pass), E-02 (Pass), E-03 (Pass), E-04 (Pass), E-05 (Pass) | Passed |
| Story 1 | Search projects by keyword | C-01 (Pass) | Passed |
| Story 2 | Calendar of a designer's availability | B-09 (Pass), B-10 (Pass), B-11 (Pass), C-06 (Pass) | Passed |
| Story 3 | Report issues with Pending / Reviewed / Rectified status | C-08 (Pass), C-09 (Pass) | Passed |
| Story 4 | Save projects to favourites | C-04 (Pass), C-05 (Pass) | Passed |
| Story 5 | Rating system | C-07 (Pass), E-09 (Pass) | Passed |
| Story 6 | Ban malicious users | E-06 (Pass), E-07 (Pass), E-08 (Pass) | Passed |
| Story 7 | See how many times each project was shortlisted | B-13 (Pass) | Passed |
| Story 8 | Search users by name | B-14 (Pass), D-01 (Pass) | Passed |
| Story 9 | Filter users by role | B-15 (Pass), D-01 (Pass) | Passed |
| Story 10 | Disable a user without deleting their data | D-06 (Pass), D-07 (Pass), D-08 (Pass) | Passed |
| Story 11 | View reports flagged by users | D-09 (Pass), E-10 (Pass) | Passed |
| Story 12 | Change reported issues to Rectified | D-10 (Pass), E-10 (Pass) | Passed |
| Other requirement 1 | Passwords stored as SHA-256 hashes | A-08 (Pass) | Passed |

## All results

| ID | Module | Test | Result | Notes |
| --- | --- | --- | --- | --- |
| A-01 | Accounts and sign-in | Register a Customer account | Pass | - |
| A-02 | Accounts and sign-in | Register an Interior Designer account | Pass | - |
| A-03 | Accounts and sign-in | Registration rejects invalid details | Pass | - |
| A-04 | Accounts and sign-in | Log in and log out | Pass | - |
| A-05 | Accounts and sign-in | Each account type only reaches its own workspace | Pass | - |
| A-06 | Accounts and sign-in | Edit your own profile | Pass | - |
| A-07 | Accounts and sign-in | Change your password | Pass | - |
| A-08 | Accounts and sign-in | Passwords are stored as salted SHA-256 hashes | Pass | - |
| B-01 | Interior Designer workspace | Create company information | Pass | - |
| B-02 | Interior Designer workspace | Company form validation | Pass | - |
| B-03 | Interior Designer workspace | Update company information | Pass | - |
| B-04 | Interior Designer workspace | Add a current project | Pass | - |
| B-05 | Interior Designer workspace | Add a past project | Fail | In the timeline, I see "Nov 2026 – Nov 2026". But I entered start date: 1 Nov 2026 and end date: 7 Nov 2026. I need these date to reflect the exact dates that I entered. |
| B-06 | Interior Designer workspace | Project form validation | Pass | - |
| B-07 | Interior Designer workspace | Edit a project | Pass | - |
| B-08 | Interior Designer workspace | Delete a project | Pass | - |
| B-09 | Interior Designer workspace | Add availability slots | Pass | - |
| B-10 | Interior Designer workspace | Availability validation | Pass | - |
| B-11 | Interior Designer workspace | Book, free and remove a slot | Pass | - |
| B-12 | Interior Designer workspace | Count views of a project | Pass | - |
| B-13 | Interior Designer workspace | Count how often a project is shortlisted | Pass | - |
| B-14 | Interior Designer workspace | Search users by name | Pass | - |
| B-15 | Interior Designer workspace | Filter users by role | Pass | - |
| C-01 | Customer experience | Search projects by keyword | Pass | - |
| C-02 | Customer experience | Filter and sort projects | Pass | - |
| C-03 | Customer experience | View a project's details | Pass | - |
| C-04 | Customer experience | Save a project to favourites | Pass | - |
| C-05 | Customer experience | Remove a favourite | Pass | - |
| C-06 | Customer experience | See a designer's availability calendar | Pass | - |
| C-07 | Customer experience | Rate and review a project | Pass | - |
| C-08 | Customer experience | Report a website issue | Pass | - |
| C-09 | Customer experience | Issue form validation | Pass | - |
| C-10 | Customer experience | Visitors and designers can't save or rate | Pass | - |
| D-01 | User Admin | Search and filter accounts | Pass | - |
| D-02 | User Admin | Create an account of any type | Pass | - |
| D-03 | User Admin | View and update an account | Pass | - |
| D-04 | User Admin | Manage the user profiles | Pass | - |
| D-05 | User Admin | Suspend a whole profile | Pass | - |
| D-06 | User Admin | Disable a user without deleting their data | Pass | - |
| D-07 | User Admin | Disabling signs the user out immediately | Pass | - |
| D-08 | User Admin | You can't disable your own account | Pass | - |
| D-09 | User Admin | View reports flagged by users | Pass | - |
| D-10 | User Admin | Mark a report Reviewed, then Rectified | Pass | - |
| E-01 | Platform Management | Daily, weekly and monthly reports | Pass | - |
| E-02 | Platform Management | Download a report as CSV | Pass | - |
| E-03 | Platform Management | Create a category | Pass | - |
| E-04 | Platform Management | Rename and deactivate a category | Pass | - |
| E-05 | Platform Management | Category delete rules | Pass | - |
| E-06 | Platform Management | Ban a malicious user | Pass | - |
| E-07 | Platform Management | Ban safeguards | Pass | - |
| E-08 | Platform Management | Lift a ban | Pass | - |
| E-09 | Platform Management | Moderate ratings | Pass | - |
| E-10 | Platform Management | Platform Management handles reports too | Pass | - |
| F-01 | General checks | Works on a phone | Pass | - |
| F-02 | General checks | Pages that don't exist | Pass | - |
| F-03 | General checks | Automated test script | Pass | - |
