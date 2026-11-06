package myapp.feature;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "favourite")
public class FavRecord {
    @EmbeddedId
    private FavKey id;
    @Column(name = "saved_at", insertable = false, updatable = false)
    private LocalDateTime savedAt;
    protected FavRecord() {}
    public FavRecord(FavKey id) { this.id = id; }
    public FavKey getId() { return id; }
    public LocalDateTime getSavedAt() { return savedAt; }
}
