package myapp.entity;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// ENTITY layer for requirement 1: all SQL for "manage user accounts and profiles".
//
// WHY JdbcTemplate instead of adding fields to User.java:
//   User.java deliberately does NOT map email, phone or password_hash, with the comment
//   "If a column is not in this class, it can never leak out through our API." An account
//   admin page must show email, but widening User.java would destroy that structural
//   guarantee (and UserRepository.java is a shared file owned by other teammates).
//   A separate read/write store keeps the guarantee intact and touches no existing file.
//
// WHY no new SQL file: layer 1 of the house recipe (SQL) already exists as usersDB.sql
// (255 rows, 4-role CHECK, soft delete, UNIQUE email), designer_profileDB.sql and
// companyDB.sql. Requirement 1 adds the MANAGEMENT layer, not a new schema.
//
// WHY explicit column lists, never "SELECT *": password_hash must not even enter Java.
@Repository
public class AccountStore {

    // All 255 seed rows in usersDB.sql share this one BCrypt-looking value. There is no
    // login system in this project and pom.xml has NO spring-security-crypto, so account
    // CRUD here manages the ACCOUNT RECORD, not credentials. password_hash is NOT NULL,
    // so new rows reuse the demo value. Real registration needs BCryptPasswordEncoder +
    // a login system; that is deliberately out of scope (see the code map document).
    public static final String DEMO_PASSWORD_HASH =
            "$2b$10$wVsSFgaU/na/hGr1fzF0yOr4rqRfNSJ5fnIV730BGgHaOdA4dktxy";

    private static final String SELECT_DETAIL =
            "SELECT u.user_id, u.name, u.email, u.phone, u.role, u.status, u.deleted, "
          + "u.created_at, u.updated_at, dp.bio, dp.years_experience, dp.specialisation, c.company_name "
          + "FROM users u "
          + "LEFT JOIN designer_profile dp ON dp.user_id = u.user_id "
          + "LEFT JOIN company c ON c.designer_id = u.user_id ";

    private final JdbcTemplate jdbc;
    private final SimpleJdbcInsert insertUser;

    // Constructor injection: Spring supplies both beans automatically because
    // spring-boot-starter-data-jpa brings in spring-boot-starter-jdbc and a DataSource.
    public AccountStore(JdbcTemplate jdbc, DataSource dataSource) {
        this.jdbc = jdbc;
        this.insertUser = new SimpleJdbcInsert(dataSource)
                .withTableName("users")
                .usingGeneratedKeyColumns("user_id");
    }

    private static final RowMapper<AccountRow> ROW_MAPPER = (rs, rowNum) -> new AccountRow(
            rs.getInt("user_id"),
            rs.getString("name"),
            rs.getString("email"),
            rs.getString("phone"),
            rs.getString("role"),
            rs.getString("status"),
            rs.getBoolean("deleted"),
            toDateTime(rs.getTimestamp("created_at")),
            toDateTime(rs.getTimestamp("updated_at")),
            rs.getString("bio"),
            rs.getObject("years_experience", Integer.class),
            rs.getString("specialisation"),
            rs.getString("company_name")
    );

    // Every filter is a bound parameter. The search text is NEVER concatenated into SQL,
    // so a customer typing "' OR 1=1 --" stays ordinary text (no SQL injection).
    public List<AccountRow> list(String role, String status, String q, boolean includeDeleted) {
        StringBuilder sql = new StringBuilder(SELECT_DETAIL).append("WHERE 1=1 ");
        List<Object> args = new ArrayList<>();

        if (!includeDeleted) sql.append("AND u.deleted = 0 ");
        if (role != null && !role.isBlank()) {
            sql.append("AND u.role = ? ");
            args.add(role);
        }
        if (status != null && !status.isBlank()) {
            sql.append("AND u.status = ? ");
            args.add(status);
        }
        if (q != null && !q.isBlank()) {
            sql.append("AND (u.name LIKE ? OR u.email LIKE ?) ");
            String like = "%" + q.trim() + "%";
            args.add(like);
            args.add(like);
        }
        sql.append("ORDER BY u.name ASC, u.user_id ASC");
        return jdbc.query(sql.toString(), ROW_MAPPER, args.toArray());
    }

    public Optional<AccountRow> findById(Integer id) {
        return jdbc.query(SELECT_DETAIL + "WHERE u.user_id = ?", ROW_MAPPER, id)
                .stream().findFirst();
    }

    // Deliberately NO "deleted = 0" filter: a soft-deleted row still occupies its email
    // because uq_users_email is a UNIQUE key (usersDB.sql:11,15). Checking only live rows
    // would produce "email already exists" for an account nobody can find in the list.
    public boolean emailExists(String email, Integer excludeId) {
        if (excludeId == null) {
            Integer n = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, email);
            return n != null && n > 0;
        }
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = ? AND user_id <> ?",
                Integer.class, email, excludeId);
        return n != null && n > 0;
    }

    // created_at / updated_at are left to the DB's DEFAULT CURRENT_TIMESTAMP. The Service
    // re-reads the row afterwards so its response contains the generated timestamps.
    public Integer insert(String name, String email, String phone, String role, String status) {
        Map<String, Object> values = new HashMap<>();
        values.put("name", name);
        values.put("email", email);
        values.put("password_hash", DEMO_PASSWORD_HASH);
        values.put("phone", phone);
        values.put("role", role);
        values.put("status", status);
        values.put("deleted", 0);
        Number key = insertUser.executeAndReturnKey(values);
        return key.intValue();
    }

    public void update(Integer id, String name, String email, String phone, String role) {
        jdbc.update("UPDATE users SET name = ?, email = ?, phone = ?, role = ? WHERE user_id = ?",
                name, email, phone, role, id);
    }

    public void setStatus(Integer id, String status) {
        jdbc.update("UPDATE users SET status = ? WHERE user_id = ?", status, id);
    }

    // Soft delete: the row stays, because company / designer_profile / projects /
    // favourite / idp_view all hold foreign keys to users.user_id.
    public void setDeleted(Integer id, boolean deleted) {
        jdbc.update("UPDATE users SET deleted = ? WHERE user_id = ?", deleted ? 1 : 0, id);
    }

    // designer_profile.user_id IS the users id (shared PK/FK, forced 1:1). We check then
    // insert-or-update instead of relying on a MySQL-version-specific ON DUPLICATE KEY
    // syntax, so the same code runs on any MySQL 8 version.
    public void upsertDesignerProfile(Integer id, String bio, Integer years, String specialisation) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM designer_profile WHERE user_id = ?", Integer.class, id);
        if (n != null && n > 0) {
            jdbc.update("UPDATE designer_profile SET bio = ?, years_experience = ?, specialisation = ? "
                            + "WHERE user_id = ?",
                    bio, years, specialisation, id);
        } else {
            jdbc.update("INSERT INTO designer_profile (user_id, bio, years_experience, specialisation) "
                            + "VALUES (?, ?, ?, ?)",
                    id, bio, years, specialisation);
        }
    }

    public List<AccountTallyRow> tallies() {
        return jdbc.query(
                "SELECT role, status, deleted, COUNT(*) AS n FROM users GROUP BY role, status, deleted",
                (rs, rowNum) -> new AccountTallyRow(
                        rs.getString("role"), rs.getString("status"),
                        rs.getBoolean("deleted"), rs.getLong("n")));
    }

    private static LocalDateTime toDateTime(Timestamp ts) {
        return ts == null ? null : ts.toLocalDateTime();
    }
}
