package com.service.catalog.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.service.catalog.entity.RecipeItem;

@Repository
public interface RecipeItemRepository extends JpaRepository<RecipeItem, Integer> {
    
}
