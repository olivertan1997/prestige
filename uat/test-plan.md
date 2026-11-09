# Prestige Interior Design - UAT test plan

- **Website under test:** https://prestige-interior.olivertan1997.workers.dev
- **Checklist page:** `uat/prestige-uat-v2.html` (open it in a web browser; it records results per round)
- **Test cases:** 56, covering the 6 project specifications and 12 user stories

> Generated from `uat/prestige-uat-v2.html` by `npm run uat:plan`. Edit the checklist, then regenerate this file.

## Test accounts

| Username | Name | Role |
| --- | --- | --- |
| `admin` | Aaron Lim | User Admin |
| `platform` | Priya Nair | Platform Management |
| `sophia` | Sophia Tan (Atelier Tan Interiors) | Interior Designer |
| `marcus` | Marcus Lee (Lee & Lumen Design Studio) | Interior Designer |
| `emily` | Emily Chen | Customer |
| `daniel` | Daniel Ng | Customer |
| `uat2.customer` | Created in A-01 | Customer |
| `uat2.designer` | Created in A-02 | Interior Designer |

The demo accounts use the demo password saved as `APP_SEED_PASSWORD` in GitHub. Run the modules in order (A to F).

This is the round v2 edition. The test accounts and projects from earlier rounds still exist on the website, so this round uses fresh names starting `uat2` / “UAT2”.

## Module A - Accounts and sign-in

Registering, logging in and out, role access, editing your own profile and password storage.

### A-01 - Register a Customer account

**Requirement:** Spec 1 · **Account:** Visitor (logged out)

**Steps**

1. Open the website and click **Join Prestige** (top right).
2. Under “I am a…”, choose **Customer**.
3. Enter Full name `UAT2 Customer`, Username `uat2.customer`, an email address, and a password of at least 8 characters in both password boxes.
4. Click **Create account**.
5. Log in with `uat2.customer` and the new password.

**Expected result**

- After creating the account you are on Log in with “Welcome to Prestige! Your account is ready - please log in.”
- After logging in you land on **Find inspiration** (the project search) and the top-right menu shows UAT2 Customer · Customer.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### A-02 - Register an Interior Designer account

**Requirement:** Spec 1 · **Account:** Visitor (logged out)

**Steps**

1. Log out, then click **Join Prestige**.
2. Choose **Interior Designer**.
3. Enter Full name `UAT2 Designer`, Username `uat2.designer`, an email address and a password (twice).
4. Click **Create account**, then log in as `uat2.designer`.

**Expected result**

- You land on **Interest in your projects** (the designer dashboard).
- A note asks you to add your company information.
- The workspace bar shows Dashboard, Portfolio, Company, Availability and User directory.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### A-03 - Registration rejects invalid details

**Requirement:** Spec 1 · **Account:** Visitor (logged out)

**Steps**

1. Open **Join Prestige** and fill in every field.
2. Type two different passwords and click **Create account**.
3. Try again with the password `short` in both boxes.
4. Try again with the username `emily`, which a demo customer already uses.

**Expected result**

- Mismatched passwords show “Passwords do not match”.
- The short password shows “Password must be at least 8 characters”.
- The taken username shows “The username 'emily' is already taken.”
- No new account is created in any of these cases.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### A-04 - Log in and log out

**Requirement:** Spec 1 · **Account:** emily

**Steps**

1. Open **Log in** and enter `emily` with a wrong password.
2. Log in as `emily` with the correct demo password.
3. Open the name menu (top right) and click **Log out**.
4. Type `/profile` after the website address and press Enter.

**Expected result**

- The wrong password shows “Incorrect username or password.”
- The correct password opens **Find inspiration**.
- After logging out, the home page shows “You have been logged out. See you soon!”
- `/profile` sends you back to Log in.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### A-05 - Each account type only reaches its own workspace

**Requirement:** Spec 1 · **Account:** emily

**Steps**

1. Log in as `emily`.
2. Open `/admin/users`, then `/platform/reports`, then `/designer/dashboard`.
3. Log out and open `/admin/users` again.

**Expected result**

- Each of the three pages shows “You don't have access to this page” (403).
- When logged out, `/admin/users` sends you to Log in.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### A-06 - Edit your own profile

**Requirement:** Spec 1 · **Account:** uat2.customer · **Needs:** A-01

**Steps**

1. Open the name menu → **My profile**.
2. Change Full name to `UAT2 Customer Two`, add a phone number and an About me text.
3. Click **Save profile**, then reload the page.

**Expected result**

- “Your profile has been updated.” appears.
- The top-right menu shows the new name straight away.
- The new values are still there after reloading.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### A-07 - Change your password

**Requirement:** Spec 1 · **Account:** uat2.customer · **Needs:** A-01

**Steps**

1. **My profile** → Change password.
2. Enter a wrong current password and a new password twice, then click **Update password**.
3. Repeat with the correct current password.
4. Log out, try the old password, then log in with the new one.

**Expected result**

- The wrong current password shows “Your current password is incorrect.”
- The correct one shows “Your password has been changed.”
- The old password no longer works; the new one does.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### A-08 - Passwords are stored as salted SHA-256 hashes

**Requirement:** Other requirement 1 · **Account:** Supabase dashboard

**Steps**

1. Open your Supabase project → **Table Editor** → `user_accounts`.
2. Look at the `password_hash` column for `emily` and `daniel`.

**Expected result**

- Every value has the form `sha256$`, then 32 hex characters, `$`, then 64 hex characters.
- No plain-text password appears anywhere.
- Emily and Daniel have the same demo password, yet their hashes differ because each has its own random salt.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

## Module B - Interior Designer workspace

Company information, the portfolio of current and past projects, availability, interest tracking and the user directory.

### B-01 - Create company information

**Requirement:** Spec 2 · **Account:** uat2.designer · **Needs:** A-02

**Steps**

1. Click **Company** in the workspace bar.
2. Fill in Company name `UAT2 Interiors Pte Ltd`, a registration number, About the company, Specialties, Years in business, Address, Phone, Business email and Website `https://example.com`.
3. Click **Create company profile**, then **View public page**.

**Expected result**

- “Company information saved.” appears and the button now reads **Save changes**.
- The public designer page uses the company name as its heading and lists the details under Company information.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-02 - Company form validation

**Requirement:** Spec 2 · **Account:** uat2.designer · **Needs:** B-01

**Steps**

1. On **Company**, set Website to `ftp://example.com` and click **Save changes**.
2. Clear Company name and click **Save changes** again.

**Expected result**

- The website shows “Website must start with http:// or https://”.
- The empty name is refused (the browser asks you to fill it in, or “Company name is required” appears).
- After reloading, the saved details are unchanged.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-03 - Update company information

**Requirement:** Spec 2 · **Account:** sophia

**Steps**

1. Log in as `sophia` → **Company**.
2. Change Specialties to `Japandi, Scandinavian, UAT2 test`.
3. Click **Save changes**, then open any of Sophia's projects.

**Expected result**

- “Company information saved.”
- The project's **Designed by** panel and Sophia's designer page show the new specialties.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-04 - Add a current project

**Requirement:** Spec 3 · **Account:** uat2.designer · **Needs:** A-02

**Steps**

1. **Portfolio** → **+ Add a project**.
2. Title `UAT2 Loft Kitchen`, Category Kitchen, Current project, Style `Industrial`, Location `Clementi`, Budget `30000`, and a start date.
3. Click **Add project**.
4. Open **Projects** and search `clementi`.

**Expected result**

- “'UAT2 Loft Kitchen' was added to your portfolio.”
- It is listed in Portfolio with status Current.
- The search finds it with a “Current project” badge. Round v1's UAT Loft Kitchen may be listed too.
- Its page shows a budget of $30,000 and a Timeline of the start date you entered followed by “ongoing”, for example “10 Nov 2026 – ongoing”.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-05 - Add a past project

**Requirement:** Spec 3 · **Account:** uat2.designer · **Needs:** A-02

**Steps**

1. **+ Add a project**: Title `UAT2 Heritage Shophouse`, Category Whole Home, **Past project**, Start date **2 October 2026** and End date **15 October 2026**.
2. Click **Add project** and open the project.
3. Open **Projects**, search `scandinavian` and open Scandinavian Calm - 4-Room HDB Living Room.

**Expected result**

- Its card shows a “Past project” badge.
- Timeline on the project page shows the exact dates you entered: “2 Oct 2026 – 15 Oct 2026”, not just the months.
- The demo project's Timeline shows full dates too: “22 Jun 2026 – 11 Aug 2026”.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-06 - Project form validation

**Requirement:** Spec 3 · **Account:** uat2.designer · **Needs:** A-02

**Steps**

1. **+ Add a project**: enter a title and leave Category on “Choose…”.
2. Set an end date earlier than the start date.
3. Click **Add project**.

**Expected result**

- “Choose a category” and “The end date cannot be before the start date” appear.
- No project is added to Portfolio.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-07 - Edit a project

**Requirement:** Spec 3 · **Account:** uat2.designer · **Needs:** B-04

**Steps**

1. **Portfolio** → **Edit** on UAT2 Loft Kitchen.
2. Change it to Past project and add an end date.
3. Click **Save changes**.

**Expected result**

- “Project updated.”
- Portfolio and the project page now show it as Past.
- The Timeline shows the start date and the new end date in full, for example “10 Nov 2026 – 20 Nov 2026”.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-08 - Delete a project

**Requirement:** Spec 3 · **Account:** uat2.designer · **Needs:** A-02

**Steps**

1. Add a project called `UAT2 Delete Me`.
2. In **Portfolio** click **Delete** on it and confirm with OK.

**Expected result**

- “Project deleted.”
- It no longer appears in Portfolio or in a search for `uat2 delete`.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-09 - Add availability slots

**Requirement:** Story 2 · **Account:** uat2.designer · **Needs:** A-02

**Steps**

1. **Availability** → pick a date next week, From `10:00`, To `12:00` → **Add slot**.
2. Add a second slot on the same day from `14:00` to `16:00`.

**Expected result**

- “Availability added.” each time.
- The calendar shows that month with both slots in green on that day.
- Both appear under Upcoming slots as Available.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-10 - Availability validation

**Requirement:** Story 2 · **Account:** uat2.designer · **Needs:** B-09

**Steps**

1. Try a slot from `15:00` to `14:00`.
2. Try `11:00` to `13:00` on the same day as B-09.
3. Try a date in the past.

**Expected result**

- “The end time must be after the start time”.
- “This overlaps an existing slot (10:00 - 12:00).”
- The past date is refused (the date picker blocks it, or “You cannot add availability in the past” appears).

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-11 - Book, free and remove a slot

**Requirement:** Story 2 · **Account:** uat2.designer · **Needs:** B-09

**Steps**

1. Under Upcoming slots click **Mark booked** on the 10:00 slot.
2. Click **Mark available** on the same slot.
3. Click **Remove** on the 14:00 slot.

**Expected result**

- “Slot updated.” While booked, the slot is grey and struck through on the calendar.
- Mark available turns it green again.
- “Slot removed.” and the 14:00 slot disappears.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-12 - Count views of a project

**Requirement:** Spec 5 · **Account:** sophia, plus a private window

**Steps**

1. As `sophia`, note the Views number for Japandi Kitchen and Dining Revamp on **Dashboard**.
2. Open a new private (incognito) window, open that project without logging in, and refresh it three times.
3. Close the private window and reload Sophia's dashboard.
4. As Sophia, open her own project, then reload the dashboard again.

**Expected result**

- Views went up by exactly 1: refreshing in the same browser session does not count again.
- Sophia viewing her own project does not change the number.
- Views (30 days) went up by 1 as well.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-13 - Count how often a project is shortlisted

**Requirement:** Spec 5, Story 7 · **Account:** sophia, plus daniel in a private window

**Steps**

1. As `sophia`, note **Times shortlisted** and **In favourites now** for Japandi Kitchen and Dining Revamp.
2. In a private window log in as `daniel`, open that project and click **Save to favourites**.
3. Reload Sophia's dashboard.
4. As Daniel click **Saved - remove**, then reload Sophia's dashboard again.

**Expected result**

- After saving, both numbers go up by 1.
- After removing, Times shortlisted stays the same and In favourites now goes back down by 1.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-14 - Search users by name

**Requirement:** Story 8 · **Account:** sophia

**Steps**

1. **User directory** → type `emi` → **Search**, and look at Emily Chen's Email and Phone columns.
2. Search `TAN`.
3. Search `zzzz`.

**Expected result**

- `emi` finds Emily Chen. Her row shows her email address, emily@example.com, and “Not given” for phone.
- `TAN` finds Sophia Tan (and the sample accounts named Tan): upper and lower case don't matter. Sophia's Email and Phone show “-”, because only customers' contact details are listed.
- `zzzz` shows “No users match your search.”

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### B-15 - Filter users by role

**Requirement:** Story 9 · **Account:** sophia

**Steps**

1. **User directory** → Role **Customer** → **Search**.
2. Change Role to **Interior Designer** → **Search**.
3. Type `e` in Name, set Role to **Customer** → **Search**, then click **Reset**.

**Expected result**

- Only Customer badges are listed, then only Interior Designer badges.
- The combined search lists only customers whose name or username contains “e”.
- Reset lists everyone again.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

## Module C - Customer experience

Searching, viewing, saving and rating projects, the availability calendar and reporting issues.

### C-01 - Search projects by keyword

**Requirement:** Story 1, Spec 4 · **Account:** Visitor or any customer

**Steps**

1. Open **Projects**.
2. Search `japandi`, then `JAPANDI kitchen`.
3. Search `punggol`, then `sophia`.
4. Search `xyzzy`.

**Expected result**

- Both japandi searches find Japandi Kitchen and Dining Revamp: case doesn't matter and every word must match.
- `punggol` finds the Minimalist Whole-Home Makeover; `sophia` finds Sophia Tan's projects.
- `xyzzy` shows “No projects match your search” with a **Clear search** button.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-02 - Filter and sort projects

**Requirement:** Spec 4 · **Account:** Visitor or any customer

**Steps**

1. Choose Category **Kitchen** → **Search**.
2. Reset Category and choose Project type **Past projects**.
3. Change Sort by to **Most viewed**, then **Title A-Z**.

**Expected result**

- Each filter shows only matching projects and the “… project(s) found” line updates.
- Most viewed puts the highest view counts first; Title A-Z is alphabetical.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-03 - View a project's details

**Requirement:** Spec 4 · **Account:** Visitor or any customer

**Steps**

1. Open Scandinavian Calm - 4-Room HDB Living Room.

**Expected result**

- The facts show Style Scandinavian, Location Tampines, Budget $28,000, the timeline, Views and Shortlisted.
- Ratings & reviews lists reviews from Emily Chen and Daniel Ng.
- Designed by shows Atelier Tan Interiors with a **View availability calendar** button.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-04 - Save a project to favourites

**Requirement:** Story 4, Spec 4 · **Account:** uat2.customer · **Needs:** A-01

**Steps**

1. Log in as `uat2.customer` and open Boutique Cafe Interior.
2. Click **♡ Save to favourites**.
3. Open **My favourites**, then go back to **Projects**.

**Expected result**

- “Saved to your favourites.” and the button changes to “♥ Saved - remove”.
- My favourites lists the project with “Saved” and today's date.
- Its card in the search results carries a “♥ Saved” tag.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-05 - Remove a favourite

**Requirement:** Story 4 · **Account:** uat2.customer · **Needs:** C-04

**Steps**

1. **My favourites** → **Remove** on Boutique Cafe Interior.

**Expected result**

- “Removed from your favourites.”
- If it was the only one, the page shows “No favourites yet”.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-06 - See a designer's availability calendar

**Requirement:** Story 2 · **Account:** Visitor or any customer

**Steps**

1. Open **Designers** → Atelier Tan Interiors.
2. Look at Availability, then click **Next ›**.
3. Open Lee & Lumen Design Studio (Marcus Lee) the same way.

**Expected result**

- A Monday-to-Sunday month grid, with today outlined.
- Sophia has green slots on Mondays, Wednesdays and Fridays (10:00-12:00 and 14:00-17:00), some greyed out as Booked.
- Next shows the following month. Marcus has slots on Tuesdays, Thursdays and Saturdays (09:30-12:30).

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-07 - Rate and review a project

**Requirement:** Story 5 · **Account:** uat2.customer · **Needs:** A-01

**Steps**

1. Open Japandi Kitchen and Dining Revamp.
2. Choose 4 stars, write a short review and click **Submit rating**.
3. Choose 5 stars and submit again.

**Expected result**

- “Thank you - your rating has been saved.” and your review appears under Ratings & reviews.
- The heading changes to “Update your rating”.
- The second submit replaces your first review (you still have one review) and the average updates.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-08 - Report a website issue

**Requirement:** Story 3 · **Account:** uat2.customer · **Needs:** A-01

**Steps**

1. Open the name menu → **Report an issue**.
2. Choose **Bug**, enter Subject `UAT2 test report`, describe the problem and click **Send report**.

**Expected result**

- “Thank you - your report was sent. Its status is now Pending.”
- My reports lists it with a Pending badge, its type and today's date.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-09 - Issue form validation

**Requirement:** Story 3 · **Account:** uat2.customer · **Needs:** A-01

**Steps**

1. On **Report an issue**, type a subject but leave “What happened?” empty.
2. Click **Send report**.

**Expected result**

- “Please describe the issue” appears.
- No new report is added to My reports.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### C-10 - Visitors and designers can't save or rate

**Requirement:** Spec 4 · **Account:** Visitor, then sophia

**Steps**

1. While logged out, open any project.
2. Log in as `sophia` and open one of Marcus's projects.

**Expected result**

- The visitor sees “Like this project?” with **Join Prestige**, and “Log in as a customer to rate this project.”
- Sophia sees no Save or Rate controls.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

## Module D - User Admin

Managing accounts and user profiles, disabling users and handling reported issues.

### D-01 - Search and filter accounts

**Requirement:** Spec 1, Story 8, Story 9 · **Account:** admin · **Needs:** A-02

**Steps**

1. Log in as `admin`; you land on User accounts.
2. Type `emi` → **Filter**.
3. Clear the name, set Role **Interior Designer** → **Filter**.
4. Set Status **Disabled** → **Filter**, then click **Reset**.

**Expected result**

- `emi` shows Emily Chen.
- The role filter shows only Interior Designers: sophia, marcus, uat.designer, uat2.designer and the 30 sample designers.
- Disabled shows only disabled accounts, or “No accounts match.”; Reset lists everyone.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-02 - Create an account of any type

**Requirement:** Spec 1 · **Account:** admin

**Steps**

1. **+ New account**: Username `uat2.platform`, Role **Platform Management**, a full name, email and password.
2. Click **Create account**.
3. In a private window, log in as `uat2.platform`.

**Expected result**

- “Account 'uat2.platform' created.” and it is listed with the Platform Management role.
- uat2.platform lands on the Daily report.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-03 - View and update an account

**Requirement:** Spec 1 · **Account:** admin · **Needs:** A-01

**Steps**

1. Click **View / edit** on `uat2.customer`.
2. Change the phone number and click **Save changes**.
3. Reload the page.

**Expected result**

- “Account updated.”
- The new phone number is still there, and the panel on the right shows the account status, last login and bio.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-04 - Manage the user profiles

**Requirement:** Spec 1 · **Account:** admin

**Steps**

1. Open **User profiles**.
2. Edit the Customer description and click **Save profile**.
3. Look at the User Admin card.

**Expected result**

- Four profiles are listed (User Admin, Interior Designer, Customer, Platform Management) with their account counts.
- “Profile 'Customer' saved.”
- The User Admin card says “The User Admin profile is always active.” and has no on/off box.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-05 - Suspend a whole profile

**Requirement:** Spec 1 · **Account:** admin, plus emily in a private window

**Steps**

1. On the Customer card untick **Profile is active** → **Save profile**.
2. In a private window try to log in as `emily`.
3. Tick **Profile is active** again → **Save profile**.
4. Log in as `emily` again.

**Expected result**

- While suspended, Emily sees “This account is disabled. Please contact a User Admin.”
- After re-activating, Emily logs in normally.
- Leave the Customer profile active when you finish.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-06 - Disable a user without deleting their data

**Requirement:** Story 10 · **Account:** admin, plus a private window · **Needs:** C-07, C-08

**Steps**

1. **User accounts** → **Disable** on `uat2.customer` → OK.
2. In a private window try to log in as `uat2.customer`.
3. As a visitor, open Japandi Kitchen and Dining Revamp.
4. As `admin`, click **Enable** on `uat2.customer`, then log in as uat2.customer.

**Expected result**

- “'uat2.customer' has been disabled. Their data is kept.” and the status shows Disabled.
- Login is refused with “This account is disabled. Please contact a User Admin.”
- Their review is still on the project and their report is still under Reported issues.
- “'uat2.customer' has been re-enabled.” and login works again.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-07 - Disabling signs the user out immediately

**Requirement:** Story 10 · **Account:** admin, plus uat2.customer in a private window · **Needs:** A-01

**Steps**

1. In a private window log in as `uat2.customer` and leave it open.
2. As `admin`, disable `uat2.customer`.
3. In the private window click **My favourites**.
4. As `admin`, enable `uat2.customer` again.

**Expected result**

- The private window is sent to Log in with “Please log in to continue. (Your session ended or your account was changed.)”

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-08 - You can't disable your own account

**Requirement:** Story 10 · **Account:** admin

**Steps**

1. In **User accounts** find the Aaron Lim row.
2. Click **View / edit** on it.

**Expected result**

- There is no Disable button on your own row.
- The account page says “This is your own account.”

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-09 - View reports flagged by users

**Requirement:** Story 11 · **Account:** admin · **Needs:** C-08

**Steps**

1. Open **Reported issues**.
2. Check the counters, then click the **Pending** tab.

**Expected result**

- Each report shows the reporter's name and role, the type, date and description, including “UAT2 test report”.
- The All, Pending, Reviewed and Rectified counters match the lists.
- The Pending tab shows only Pending reports.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### D-10 - Mark a report Reviewed, then Rectified

**Requirement:** Story 12 · **Account:** admin, then uat2.customer · **Needs:** C-08

**Steps**

1. On “UAT2 test report” choose **Reviewed**, type `We are checking this` and click **Save**.
2. Click **✓ Mark as rectified**.
3. Log in as `uat2.customer` → **My reported issues**.

**Expected result**

- “Report #… is now Reviewed.” then “Report #… is now Rectified.”; the badge shows the status and “by Aaron Lim”.
- The reporter sees Rectified, the message, and “Rectified” with today's date.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

## Module E - Platform Management

Reports, categories, banning users and moderating ratings.

### E-01 - Daily, weekly and monthly reports

**Requirement:** Spec 6 · **Account:** platform · **Needs:** Modules B and C

**Steps**

1. Log in as `platform`; you land on the Daily report.
2. Read today's tiles and the History table.
3. Click **Weekly**, then **Monthly**.

**Expected result**

- Today's tiles count today's UAT activity: views, shortlists, new users, new projects, issues and ratings.
- History lists 7 days (Daily), 8 weeks starting on Mondays (Weekly) and 12 months (Monthly), newest first.
- Most viewed, Most shortlisted, Top rated, Projects by category and Reported issues are filled in.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-02 - Download a report as CSV

**Requirement:** Spec 6 · **Account:** platform

**Steps**

1. On the Monthly report click **Download CSV**.
2. Open the file in Excel or Google Sheets.

**Expected result**

- The file is named prestige-monthly-report-<today's date>.csv.
- It has the columns Period, Start, End (exclusive), New users, New projects, Project views, Shortlists, Issues reported and Ratings, with 12 rows.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-03 - Create a category

**Requirement:** Spec 6 · **Account:** platform, then uat2.designer

**Steps**

1. **Categories** → New category `Balcony & Outdoor` → **Create category**.
2. As `uat2.designer`, open **+ Add a project** and look at the Category list; also check the Category filter on **Projects**.

**Expected result**

- “Category 'Balcony & Outdoor' created.” and it is listed as Active with 0 projects.
- It appears in the designer's Category list and in the search filter.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-04 - Rename and deactivate a category

**Requirement:** Spec 6 · **Account:** platform · **Needs:** E-03

**Steps**

1. Rename it to `Balcony & Garden` → **Save**.
2. Click **Deactivate**, then check the designer's Category list and the search filter.
3. Click **Activate**.

**Expected result**

- “Category updated.”
- “'Balcony & Garden' is now inactive.” and it disappears from the project form and the search filter.
- After Activate it is back (“… is now active.”).

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-05 - Category delete rules

**Requirement:** Spec 6 · **Account:** platform · **Needs:** E-03

**Steps**

1. Click **Delete** on Kitchen → OK.
2. Click **Delete** on Balcony & Garden → OK.

**Expected result**

- Kitchen is kept: “'Kitchen' is used by … project(s). Deactivate it instead of deleting it.”
- Balcony & Garden is removed: “Category deleted.”

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-06 - Ban a malicious user

**Requirement:** Story 6 · **Account:** platform, plus a private window · **Needs:** B-01, B-04

**Steps**

1. **Users & bans** → find `uat2.designer`, enter Reason `Spam bot test` → **Ban**.
2. In a private window try to log in as `uat2.designer`.
3. As a visitor, search **Projects** for `UAT2 Loft` and open **Designers**.

**Expected result**

- “'uat2.designer' has been banned and signed out.” and the row shows Banned with the reason.
- Login is refused: “This account has been banned by Platform Management.”
- UAT2 Interiors and its projects are gone from search and the designer list; their pages show “We couldn't find that page”.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-07 - Ban safeguards

**Requirement:** Story 6 · **Account:** platform

**Steps**

1. Look at the rows for `admin` and `platform`.
2. On a customer row click **Ban** without typing a reason.

**Expected result**

- Staff rows say “Staff accounts cannot be banned”.
- The browser asks you to fill in the reason, and nobody is banned.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-08 - Lift a ban

**Requirement:** Story 6 · **Account:** platform · **Needs:** E-06

**Steps**

1. Click **Lift ban** on `uat2.designer`.
2. Log in as `uat2.designer`, then search for `UAT2 Loft` as a visitor.

**Expected result**

- “The ban on 'uat2.designer' has been lifted.”
- Login works and the projects are visible again.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-09 - Moderate ratings

**Requirement:** Story 5 · **Account:** platform · **Needs:** C-07

**Steps**

1. Open **Ratings** and note the average.
2. Click **Hide** on uat2.customer's rating, then open that project.
3. Back on Ratings click **Show**, then **Delete** → OK.

**Expected result**

- The page shows the average rating, visible ratings, all ratings and Top rated projects.
- “Rating hidden. It no longer counts towards averages.”; the rating is marked Hidden and no longer appears on the project page.
- Show brings it back (“Rating is visible again.”); Delete removes it (“Rating deleted.”).

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### E-10 - Platform Management handles reports too

**Requirement:** Story 11, Story 12 · **Account:** platform · **Needs:** C-08

**Steps**

1. Open **Reported issues**.
2. Change the status of one report.

**Expected result**

- You see the same list as the User Admin.
- The status changes and shows “by Priya Nair”.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

## Module F - General checks

Phone layout, missing pages and the automated test script.

### F-01 - Works on a phone

**Requirement:** General · **Account:** Any account

**Steps**

1. Open the website on a phone, or make the browser window narrow.
2. Visit the home page, Projects, a project, a designer calendar and a form.

**Expected result**

- Nothing scrolls sideways.
- The menu and forms stack into one column and the calendar stays readable.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### F-02 - Pages that don't exist

**Requirement:** General · **Account:** Visitor

**Steps**

1. Open `/this-page-does-not-exist`.
2. Open `/projects/999999`.

**Expected result**

- Both show the 404 page “We couldn't find that page” with links to the home page and Projects.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

### F-03 - Automated test script

**Requirement:** General · **Account:** Project folder or GitHub

**Steps**

1. In the project folder run `npm test`, or open the latest run under GitHub → Actions.

**Expected result**

- Twenty lines end in “Good”.
- The last line reads “OVERALL: 20/20 features Good | 92/92 test cases passed”.

**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________

## Requirement traceability

| Requirement | What it covers | Test cases |
| --- | --- | --- |
| Spec 1 | Manage user accounts and user profiles | A-01, A-02, A-03, A-04, A-05, A-06, A-07, D-01, D-02, D-03, D-04, D-05 |
| Spec 2 | Interior Designers manage their company information | B-01, B-02, B-03 |
| Spec 3 | Interior Designers manage a portfolio of current and past projects | B-04, B-05, B-06, B-07, B-08 |
| Spec 4 | Customers search, view and save projects | C-01, C-02, C-03, C-04, C-10 |
| Spec 5 | Interior Designers track views and shortlists | B-12, B-13 |
| Spec 6 | Platform Management manages categories and gets reports | E-01, E-02, E-03, E-04, E-05 |
| Story 1 | Search projects by keyword | C-01 |
| Story 2 | Calendar of a designer's availability | B-09, B-10, B-11, C-06 |
| Story 3 | Report issues with Pending / Reviewed / Rectified status | C-08, C-09 |
| Story 4 | Save projects to favourites | C-04, C-05 |
| Story 5 | Rating system | C-07, E-09 |
| Story 6 | Ban malicious users | E-06, E-07, E-08 |
| Story 7 | See how many times each project was shortlisted | B-13 |
| Story 8 | Search users by name | B-14, D-01 |
| Story 9 | Filter users by role | B-15, D-01 |
| Story 10 | Disable a user without deleting their data | D-06, D-07, D-08 |
| Story 11 | View reports flagged by users | D-09, E-10 |
| Story 12 | Change reported issues to Rectified | D-10, E-10 |
| Other requirement 1 | Passwords stored as SHA-256 hashes | A-08 |
