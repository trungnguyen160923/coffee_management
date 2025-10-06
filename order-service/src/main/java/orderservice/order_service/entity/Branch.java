package orderservice.order_service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "branches")
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "branch_id")
    private Integer branchId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "manager_user_id")
    private Integer managerUserId;

    @Column(name = "openhours")
    private LocalTime openHours;

    @Column(name = "endhours")
    private LocalTime endHours;

    @Column(name = "create_at")
    private LocalDateTime createAt;

    @Column(name = "update_at")
    private LocalDateTime updateAt;

    @Column(name = "latitude", precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 11, scale = 8)
    private BigDecimal longitude;

    // Constructors
    public Branch() {
    }

    public Branch(String name, String address, String phone, Integer managerUserId,
            LocalTime openHours, LocalTime endHours) {
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.managerUserId = managerUserId;
        this.openHours = openHours;
        this.endHours = endHours;
    }

    // Getters and Setters
    public Integer getBranchId() {
        return branchId;
    }

    public void setBranchId(Integer branchId) {
        this.branchId = branchId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Integer getManagerUserId() {
        return managerUserId;
    }

    public void setManagerUserId(Integer managerUserId) {
        this.managerUserId = managerUserId;
    }

    public LocalTime getOpenHours() {
        return openHours;
    }

    public void setOpenHours(LocalTime openHours) {
        this.openHours = openHours;
    }

    public LocalTime getEndHours() {
        return endHours;
    }

    public void setEndHours(LocalTime endHours) {
        this.endHours = endHours;
    }

    public LocalDateTime getCreateAt() {
        return createAt;
    }

    public void setCreateAt(LocalDateTime createAt) {
        this.createAt = createAt;
    }

    public LocalDateTime getUpdateAt() {
        return updateAt;
    }

    public void setUpdateAt(LocalDateTime updateAt) {
        this.updateAt = updateAt;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    @PrePersist
    protected void onCreate() {
        createAt = LocalDateTime.now();
        updateAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updateAt = LocalDateTime.now();
    }
}
