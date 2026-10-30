package myapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to the existing "company" table (companyDB.sql). One company per designer.
@Entity
@Table(name = "company")
public class Company {

    @Id
    @Column(name = "company_id")
    private Integer id;

    @Column(name = "designer_id", nullable = false)
    private Integer designerId;

    @Column(name = "company_name", nullable = false, length = 150)
    private String companyName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    // No-argument constructor required by JPA
    public Company() {}

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getDesignerId() { return designerId; }
    public void setDesignerId(Integer designerId) { this.designerId = designerId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
}
