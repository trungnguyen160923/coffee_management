package orderservice.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalTime;

public class CreateBranchRequest {

    @NotBlank(message = "Branch name is required")
    @Size(max = 150, message = "Branch name must not exceed 150 characters")
    private String name;

    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    private Integer managerUserId;

    private LocalTime openHours;

    private LocalTime endHours;

    // Constructors
    public CreateBranchRequest() {
    }

    public CreateBranchRequest(String name, String address, String phone, Integer managerUserId,
            LocalTime openHours, LocalTime endHours) {
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.managerUserId = managerUserId;
        this.openHours = openHours;
        this.endHours = endHours;
    }

    // Getters and Setters
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
}
