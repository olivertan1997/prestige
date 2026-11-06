package myapp.feature;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FavRepository extends JpaRepository<FavRecord, FavKey> {
    @Query("SELECT f FROM FavRecord f WHERE f.id.customerId = :customerId " +
           "ORDER BY f.savedAt DESC, f.id.idpId DESC")
    List<FavRecord> listByCustomer(@Param("customerId") Integer customerId);

    @Modifying
    @Query(value = "INSERT IGNORE INTO favourite (customer_id, idp_id) VALUES (:customer, :project)", nativeQuery = true)
    int insertIfAbsent(@Param("customer") Integer customerId, @Param("project") Integer idpId);
}
