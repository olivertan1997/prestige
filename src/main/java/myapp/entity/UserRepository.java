package myapp.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    // A designer customers may look at: right role, ACTIVE, not soft-deleted.
    // "default" methods let us put a little logic inside the interface.
    default Optional<User> findActiveDesigner(Integer id) {
        return findById(id).filter(User::isActiveDesigner);
    }

    // SELECT * FROM users WHERE role = ? AND status = ? AND deleted = false ORDER BY name
    List<User> findByRoleAndStatusAndDeletedFalseOrderByNameAsc(String role, String status);
}
