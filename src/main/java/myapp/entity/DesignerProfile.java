package myapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to the existing "designer_profile" table (designer_profileDB.sql).
// Its primary key is the SAME number as users.user_id (one profile per designer).
@Entity
@Table(name = "designer_profile")
public class DesignerProfile {

    @Id
    @Column(name = "user_id")
    private Integer id;

    @Column(name = "bio", length = 2000)
    private String bio;

    @Column(name = "years_experience")
    private Integer yearsExperience;

    @Column(name = "specialisation", length = 150)
    private String specialisation;

    // No-argument constructor required by JPA
    public DesignerProfile() {}

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public Integer getYearsExperience() { return yearsExperience; }
    public void setYearsExperience(Integer yearsExperience) { this.yearsExperience = yearsExperience; }
    public String getSpecialisation() { return specialisation; }
    public void setSpecialisation(String specialisation) { this.specialisation = specialisation; }
}
