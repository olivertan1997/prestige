package myapp.entity;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/** One row = one customer shortlisting one IDP. */
@Entity
// Using favourite as shortlist
@Table(name = "favourite")
@IdClass(Shortlist.Key.class)
public class Shortlist {

    @Id
    @Column(name = "customer_id")
    private Integer customerId;

    @Id
    @Column(name = "idp_id")
    private Integer idpId;

    protected Shortlist() {} // required by JPA

    public Shortlist(Integer customerId, Integer idpId) {
        this.customerId = customerId;
        this.idpId = idpId;
    }

    public Integer getCustomerId() { return customerId; }
    public Integer getIdpId()      { return idpId; }

    /** Composite key: one customer can shortlist a given IDP once. */
    public static class Key implements Serializable {
        private Integer customerId;
        private Integer idpId;

        public Key() {}

        @Override
        public boolean equals(Object o) {
            return o instanceof Key k
                    && Objects.equals(customerId, k.customerId)
                    && Objects.equals(idpId, k.idpId);
        }

        @Override
        public int hashCode() { return Objects.hash(customerId, idpId); }
    }
}
