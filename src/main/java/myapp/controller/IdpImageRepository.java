package myapp.controller;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface IdpImageRepository extends JpaRepository<IdpImage, Integer> {

    // Spring writes the SQL from the method name:
    // SELECT * FROM idp_image WHERE idp_id IN (...) AND is_cover = true
    List<IdpImage> findByIdpIdInAndCoverTrue(Collection<Integer> idpIds);

    // All images of ONE project, in the order the designer arranged them
    List<IdpImage> findByIdpIdOrderByDisplayOrderAsc(Integer idpId);
}
