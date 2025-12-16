package com.service.profile.mapper;

import com.service.profile.dto.response.PayrollResponse;
import com.service.profile.entity.Payroll;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PayrollMapper {
    
    @Mapping(target = "userRole", expression = "java(payroll.getUserRole().name())")
    @Mapping(target = "status", expression = "java(payroll.getStatus().name())")
    PayrollResponse toPayrollResponse(Payroll payroll);
}

