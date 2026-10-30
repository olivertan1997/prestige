package myapp.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DesignerProfileRepository extends JpaRepository<DesignerProfile, Integer> {
    // findById(designerId) is inherited, because the profile id IS the designer's user id
}
