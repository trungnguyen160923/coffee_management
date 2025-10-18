package com.service.catalog.repository;

import com.service.catalog.entity.RecipeItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecipeItemRepository extends JpaRepository<RecipeItem, Integer> {
    
    /**
     * Tìm tất cả recipe items theo recipe ID
     */
    List<RecipeItem> findByRecipeRecipeId(Integer recipeId);
    
    /**
     * Tìm recipe items theo ingredient ID
     */
    List<RecipeItem> findByIngredientIngredientId(Integer ingredientId);
    
    /**
     * Tìm recipe items theo recipe ID và ingredient ID
     */
    Optional<RecipeItem> findByRecipeRecipeIdAndIngredientIngredientId(Integer recipeId, Integer ingredientId);
    
    /**
     * Xóa tất cả recipe items theo recipe ID
     */
    void deleteByRecipeRecipeId(Integer recipeId);
    
    /**
     * Đếm số recipe items theo recipe ID
     */
    long countByRecipeRecipeId(Integer recipeId);
    
    /**
     * Tìm recipe items với thông tin ingredient
     */
    @Query("SELECT ri FROM RecipeItem ri JOIN ri.ingredient i WHERE ri.recipe.recipeId = :recipeId")
    List<RecipeItem> findRecipeItemsWithIngredient(@Param("recipeId") Integer recipeId);
    
    /**
     * Tìm recipe items theo recipe ID và sắp xếp theo ingredient name
     */
    @Query("SELECT ri FROM RecipeItem ri JOIN ri.ingredient i WHERE ri.recipe.recipeId = :recipeId ORDER BY i.name")
    List<RecipeItem> findRecipeItemsOrderedByIngredientName(@Param("recipeId") Integer recipeId);
}