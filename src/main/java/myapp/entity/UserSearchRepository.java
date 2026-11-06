package myapp.entity;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserSearchRepository extends JpaRepository<UserSearch, Integer> {

    // Name contains the text (any case), soft-deleted accounts excluded, A-Z.
    List<UserSearch> findByNameContainingIgnoreCaseAndDeletedFalseOrderByNameAsc(String name, Pageable pageable);

    // Same, limited to one role (e.g. CUSTOMER).
    List<UserSearch> findByNameContainingIgnoreCaseAndRoleAndDeletedFalseOrderByNameAsc(String name, String role, Pageable pageable);
}
