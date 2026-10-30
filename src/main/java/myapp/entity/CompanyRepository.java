package myapp.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Integer> {

    // SELECT * FROM company WHERE designer_id = ?
    Optional<Company> findByDesignerId(Integer designerId);
}
