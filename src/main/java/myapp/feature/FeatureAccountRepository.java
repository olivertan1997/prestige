package myapp.feature;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeatureAccountRepository extends JpaRepository<FeatureAccount, Integer> {
    Optional<FeatureAccount> findByEmailIgnoreCase(String email);
}
