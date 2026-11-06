package myapp.feature;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

public interface AdminReportRepository extends JpaRepository<AdminReport, Integer> {
    Page<AdminReport> findByStatus(String status, Pageable pageable);

    /** One SQL statement prevents two admins from overwriting each other's decision. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE issue_report SET status='RECTIFIED', handled_by=:admin, rectified_at=:now " +
            "WHERE report_id=:id AND status='OPEN'", nativeQuery = true)
    int rectifyOpen(@Param("id") Integer id, @Param("admin") Integer adminId,
                    @Param("now") LocalDateTime utcNow);
}
