package myapp.entity;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ShortlistRepository extends JpaRepository<Shortlist, Shortlist.Key> {

    /** One row of the grouped result. */
    interface ShortlistCountRow {
        Integer getIdpId();
        Long getShortlistCount();
    }

    /** SELECT idp_id, COUNT(customer_id) FROM favourite GROUP BY idp_id */
    @Query("""
            SELECT s.idpId AS idpId, COUNT(s.customerId) AS shortlistCount
            FROM Shortlist s
            GROUP BY s.idpId
            ORDER BY COUNT(s.customerId) DESC
            """)
    List<ShortlistCountRow> countShortlistsGroupedByIdp();

    /** Count for a single IDP. */
    long countByIdpId(Integer idpId);
}
