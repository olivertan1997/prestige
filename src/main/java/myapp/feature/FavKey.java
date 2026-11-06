package myapp.feature;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

/** The database's composite primary key prevents duplicate saved projects. */
@Embeddable
public class FavKey implements Serializable {
    @Column(name = "customer_id")
    private Integer customerId;
    @Column(name = "idp_id")
    private Integer idpId;

    protected FavKey() {}
    public FavKey(Integer customerId, Integer idpId) {
        this.customerId = customerId;
        this.idpId = idpId;
    }
    public Integer getCustomerId() { return customerId; }
    public Integer getIdpId() { return idpId; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FavKey other)) return false;
        return Objects.equals(customerId, other.customerId) && Objects.equals(idpId, other.idpId);
    }
    @Override public int hashCode() { return Objects.hash(customerId, idpId); }
}
