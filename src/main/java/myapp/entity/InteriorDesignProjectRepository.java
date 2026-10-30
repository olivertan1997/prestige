package myapp.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InteriorDesignProjectRepository
        extends JpaRepository<InteriorDesignProject, Integer>,
                JpaSpecificationExecutor<InteriorDesignProject> {
    // JpaRepository gives us basic CRUD for free (like TaskRepository).
    // JpaSpecificationExecutor lets us build the WHERE clause in Java at runtime,
    // which we need because the user can type any number of keywords.

    // All visible (not soft-deleted) projects of one designer, newest first
    List<InteriorDesignProject> findByDesignerIdAndDeletedFalseOrderByCreatedAtDescIdDesc(Integer designerId);

    // ONE project, but only if it belongs to that designer and is not soft-deleted.
    // Used by "manage my projects" so a designer can only edit/delete their OWN projects,
    // even without a login system (you can't accidentally — or deliberately — guess another
    // designer's project id in the URL and change it).
    Optional<InteriorDesignProject> findByIdAndDesignerIdAndDeletedFalse(Integer id, Integer designerId);
}
