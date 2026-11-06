package myapp.entity;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IdpViewRepository extends JpaRepository<IdpView, Long> {

    /** One row of the grouped result. */
    interface ViewCountRow {
        Integer getIdpId();
        Long getViewCount();
    }

    /** SELECT idp_id, COUNT(view_id) FROM idp_view GROUP BY idp_id */
    @Query("""
            SELECT v.idpId AS idpId, COUNT(v.viewId) AS viewCount
            FROM IdpView v
            GROUP BY v.idpId
            ORDER BY COUNT(v.viewId) DESC
            """)
    List<ViewCountRow> countViewsGroupedByIdp();

    /** Count for a single IDP. */
    long countByIdpId(Integer idpId);

    /** True if the project exists and has not been soft-deleted. */
    @Query("""
            SELECT COUNT(p) > 0
            FROM InteriorDesignProject p
            WHERE p.id = :idpId AND p.deleted = false
            """)
    boolean projectExists(Integer idpId);
}
