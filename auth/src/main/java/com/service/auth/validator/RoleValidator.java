package com.service.auth.validator;

import java.util.Objects;

import com.service.auth.constant.PredefinedRole;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class RoleValidator implements ConstraintValidator<RoleConstraint, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (Objects.isNull(value)) return false;

       return value.equals(PredefinedRole.ADMIN_ROLE) ||
              value.equals(PredefinedRole.MANAGER_ROLE) ||
              value.equals(PredefinedRole.STAFF_ROLE) ||
              value.equals(PredefinedRole.CUSTOMER_ROLE);
    }

    @Override
    public void initialize(RoleConstraint constraintAnnotation) {
        ConstraintValidator.super.initialize(constraintAnnotation);
    }
}
