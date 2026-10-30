package myapp.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, Integer> {

    // SELECT * FROM availability WHERE designer_id = ? AND availability_date BETWEEN ? AND ?
    // (BETWEEN includes both the first and the last date)
    List<Availability> findByDesignerIdAndAvailabilityDateBetween(Integer designerId, LocalDate from, LocalDate to);
}
