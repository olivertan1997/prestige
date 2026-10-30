package myapp.controller;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to the existing "idp_image" table (idp_imageDB.sql).
// Each project has several images, exactly one of them has is_cover = 1.
@Entity
@Table(name = "idp_image")
public class IdpImage {

    @Id
    @Column(name = "image_id")
    private Integer id;

    // Which project this image belongs to (interior_design_project.idp_id)
    @Column(name = "idp_id", nullable = false)
    private Integer idpId;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "caption", length = 255)
    private String caption;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "is_cover", nullable = false)
    private boolean cover;

    // No-argument constructor required by JPA
    public IdpImage() {}

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getIdpId() { return idpId; }
    public void setIdpId(Integer idpId) { this.idpId = idpId; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public boolean isCover() { return cover; }
    public void setCover(boolean cover) { this.cover = cover; }
}
