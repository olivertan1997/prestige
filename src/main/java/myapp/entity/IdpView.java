package myapp.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One row = one view of an IDP (InteriorDesignProject). */
@Entity
@Table(name = "idp_view")
public class IdpView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "view_id")
    private Long viewId;

    // Same type as InteriorDesignProject.id
    @Column(name = "idp_id", nullable = false)
    private Integer idpId;

    // Null when the visitor is not logged in (the column now allows NULL)
    @Column(name = "customer_id")
    private Integer customerId;

    // NOT NULL in the table with no default, so we always fill it in
    @Column(name = "view_date", nullable = false)
    private LocalDate viewDate;

    // view_time is not mapped on purpose: MySQL fills it in (DEFAULT CURRENT_TIMESTAMP)

    protected IdpView() {} // required by JPA

    public IdpView(Integer idpId, Integer customerId) {
        this.idpId = idpId;
        this.customerId = customerId;
        this.viewDate = LocalDate.now();
    }

    public Long getViewId()          { return viewId; }
    public Integer getIdpId()        { return idpId; }
    public Integer getCustomerId()   { return customerId; }
    public LocalDate getViewDate()   { return viewDate; }
}
