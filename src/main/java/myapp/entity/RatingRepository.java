package myapp.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Integer> {

    // Average score of a designer, or null if the designer has no ratings yet
    @Query("select avg(r.score) from Rating r where r.designerId = :designerId")
    Double findAverageScore(@Param("designerId") Integer designerId);

    // SELECT COUNT(*) FROM rating WHERE designer_id = ?
    long countByDesignerId(Integer designerId);
}
