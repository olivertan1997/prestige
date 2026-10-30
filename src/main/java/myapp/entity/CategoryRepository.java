package myapp.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    // Active categories only, A to Z — used for the "category" dropdown when adding/editing a project
    List<Category> findByActiveTrueOrderByNameAsc();
}
