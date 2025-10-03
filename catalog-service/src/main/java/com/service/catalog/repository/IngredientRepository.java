package com.service.catalog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.service.catalog.entity.Ingredient;

@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, Integer> {
    
}
