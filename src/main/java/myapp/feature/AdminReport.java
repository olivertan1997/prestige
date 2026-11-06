package myapp.feature;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Matches issue_reportDB.sql exactly; the DB only permits OPEN and RECTIFIED. */
@Entity
@Table(name = "issue_report")
public class AdminReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Integer id;
    @Column(name = "reporter_id", nullable = false)
    private Integer reporterId;
    @Column(name = "handled_by")
    private Integer handledBy;
    @Column(name = "issue_type", nullable = false, length = 20)
    private String issueType;
    @Column(name = "target_idp_id")
    private Integer targetIdpId;
    @Column(name = "target_designer_id")
    private Integer targetDesignerId;
    @Column(name = "title", nullable = false, length = 150)
    private String title;
    @Column(name = "description", nullable = false, length = 2000)
    private String description;
    @Column(name = "status", nullable = false, length = 10)
    private String status;
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
    @Column(name = "rectified_at")
    private LocalDateTime rectifiedAt;
    protected AdminReport() {}
    public Integer getId() { return id; }
    public Integer getReporterId() { return reporterId; }
    public Integer getHandledBy() { return handledBy; }
    public String getIssueType() { return issueType; }
    public Integer getTargetIdpId() { return targetIdpId; }
    public Integer getTargetDesignerId() { return targetDesignerId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getRectifiedAt() { return rectifiedAt; }
}
