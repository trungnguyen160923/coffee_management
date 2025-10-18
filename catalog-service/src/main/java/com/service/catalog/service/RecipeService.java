package com.service.catalog.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import com.service.catalog.dto.request.recipe.RecipeCreationRequest;
import com.service.catalog.dto.request.recipe.RecipeUpdateRequest;
import com.service.catalog.dto.response.RecipeResponse;
import com.service.catalog.entity.Ingredient;
import com.service.catalog.entity.ProductDetail;
import com.service.catalog.entity.Recipe;
import com.service.catalog.entity.RecipeItem;
import com.service.catalog.entity.Unit;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.mapper.RecipeMapper;
import com.service.catalog.repository.RecipeRepository;
import com.service.catalog.repository.IngredientRepository;
import com.service.catalog.repository.UnitRepository;
import com.service.catalog.repository.ProductDetailRepository;
import com.service.catalog.repository.RecipeItemRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RecipeService {
    RecipeRepository recipeRepository;
    RecipeMapper recipeMapper;
    IngredientRepository ingredientRepository;
    UnitRepository unitRepository;
    ProductDetailRepository productDetailRepository;
    RecipeItemRepository recipeItemRepository;

    @Transactional
    public List<RecipeResponse> getAllRecipes() {
        return recipeRepository.findAll()
                .stream()
                .map(recipeMapper::toRecipeResponse)
                .toList();
    }

    @Transactional
    public Page<RecipeResponse> searchRecipes(
            String keyword,
            String status,
            Integer pdId,
            Integer productId,
            Integer categoryId,
            Integer page,
            Integer size,
            String sortBy,
            String sortDir
    ) {
        Pageable pageable = PageRequest.of(
                page != null && page >= 0 ? page : 0,
                size != null && size > 0 ? size : 10,
                ("desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC),
                sortBy != null && !sortBy.isBlank() ? sortBy : "updateAt"
        );

        Specification<Recipe> spec = Specification.where(null);

        // exclude soft-deleted by default unless caller sets status explicitly
        if (status == null || status.isBlank()) {
            spec = spec.and((root, cq, cb) -> cb.notEqual(root.get("status"), "DELETED"));
        }

        if (keyword != null && !keyword.isBlank()) {
            String kw = "%" + keyword.trim().toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), kw),
                    cb.like(cb.lower(root.get("description")), kw),
                    cb.like(cb.lower(root.get("instructions")), kw)
            ));
        }

        if (status != null && !status.isBlank()) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }

        if (pdId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("productDetail").get("pdId"), pdId));
        }

        if (productId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("productDetail").get("product").get("productId"), productId));
        }

        if (categoryId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("productDetail").get("product").get("category").get("categoryId"), categoryId));
        }

        Page<Recipe> pageData = recipeRepository.findAll(spec, pageable);
        return pageData.map(recipeMapper::toRecipeResponse);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public RecipeResponse createRecipe(RecipeCreationRequest request) {
        // Validate unique constraint: name + pd_id + version
        if (recipeRepository.existsByNameAndProductDetailPdIdAndVersion(
                request.getName(), request.getPdId(), request.getVersion())) {
            throw new AppException(ErrorCode.RECIPE_NAME_ALREADY_EXISTS);
        }
        
        Recipe recipe = recipeMapper.toRecipe(request);

        // Wire product detail from pdId as an entity reference (no DB hit)
        ProductDetail productDetail = new ProductDetail();
        productDetail.setPdId(request.getPdId());
        recipe.setProductDetail(productDetail);

        // Build recipe items from request
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            List<RecipeItem> items = new ArrayList<>();
            for (var itemReq : request.getItems()) {
                RecipeItem item = new RecipeItem();

                // set parent
                item.setRecipe(recipe);

                // Fetch actual entities instead of creating references
                Ingredient ingredient = ingredientRepository.findById(itemReq.getIngredientId())
                    .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));
                item.setIngredient(ingredient);

                Unit unit = unitRepository.findById(itemReq.getUnitCode())
                    .orElseThrow(() -> new AppException(ErrorCode.UNIT_NOT_FOUND));
                item.setUnit(unit);

                // set values
                item.setQty(itemReq.getQty());
                item.setNote(itemReq.getNote());

                // timestamps
                item.setCreateAt(LocalDateTime.now());
                item.setUpdateAt(LocalDateTime.now());

                items.add(item);
            }
            recipe.setItems(items);
        }

        // timestamps for recipe
        recipe.setCreateAt(LocalDateTime.now());
        recipe.setUpdateAt(LocalDateTime.now());

        recipeRepository.save(recipe);

        // Set ProductDetail active = true after successful recipe creation
        ProductDetail productDetailToUpdate = productDetailRepository.findById(request.getPdId())
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product Detail not found"));
        productDetailToUpdate.setActive(true);
        productDetailRepository.save(productDetailToUpdate);

        // Reload the recipe to ensure associations (productDetail/product/category, items, ingredient, unit) are fully initialized
        Recipe persisted = recipeRepository.findWithAllByRecipeId(recipe.getRecipeId())
                .orElseThrow(() -> new AppException(ErrorCode.RECIPE_NOT_FOUND));
        return recipeMapper.toRecipeResponse(persisted);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public RecipeResponse updateRecipe(Integer recipeId, RecipeUpdateRequest request) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new AppException(ErrorCode.RECIPE_NOT_FOUND));
        
        // Update product detail if provided
        if (request.getPdId() != null) {
            ProductDetail productDetail = new ProductDetail();
            productDetail.setPdId(request.getPdId());
            recipe.setProductDetail(productDetail);
        }

        // Update fields if provided
        if (request.getName() != null) {
            recipe.setName(request.getName());
        }
        if (request.getDescription() != null) {
            recipe.setDescription(request.getDescription());
        }
        if (request.getYield() != null) {
            recipe.setYield(request.getYield());
        }
        if (request.getInstructions() != null) {
            recipe.setInstructions(request.getInstructions());
        }
        if (request.getStatus() != null) {
            recipe.setStatus(request.getStatus());
        }
        if (request.getVersion() != null) {
            recipe.setVersion(request.getVersion());
        }

        // Diff-by-id for items if provided
        if (request.getItems() != null) {
            // Build a map of existing items by id for quick lookup
            var existingById = new java.util.HashMap<Integer, RecipeItem>();
            for (RecipeItem it : recipe.getItems()) {
                existingById.put(it.getId(), it);
            }

            // Track ids we have seen to determine deletions later
            var seenIds = new java.util.HashSet<Integer>();

            // Upsert incoming items
            for (var itemReq : request.getItems()) {
                RecipeItem target;
                if (itemReq.getId() != null && existingById.containsKey(itemReq.getId())) {
                    // Update existing
                    target = existingById.get(itemReq.getId());
                    seenIds.add(target.getId());
                } else {
                    // Create new
                    target = new RecipeItem();
                    target.setRecipe(recipe);
                    target.setCreateAt(LocalDateTime.now());
                    recipe.getItems().add(target);
                }

                // Set/Update fields - fetch actual entities
                Ingredient ingredient = ingredientRepository.findById(itemReq.getIngredientId())
                    .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));
                target.setIngredient(ingredient);

                Unit unit = unitRepository.findById(itemReq.getUnitCode())
                    .orElseThrow(() -> new AppException(ErrorCode.UNIT_NOT_FOUND));
                target.setUnit(unit);

                target.setQty(itemReq.getQty());
                target.setNote(itemReq.getNote());
                target.setUpdateAt(LocalDateTime.now());
            }

            // Remove items that are not present in the payload anymore
            if (!existingById.isEmpty()) {
                recipe.getItems().removeIf(existing -> existing.getId() != null && !seenIds.contains(existing.getId()));
            }
        }
        
        recipe.setUpdateAt(LocalDateTime.now());
        recipeRepository.save(recipe);

        Recipe persisted = recipeRepository.findWithAllByRecipeId(recipe.getRecipeId())
                .orElseThrow(() -> new AppException(ErrorCode.RECIPE_NOT_FOUND));
        return recipeMapper.toRecipeResponse(persisted);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteRecipe(Integer recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new AppException(ErrorCode.RECIPE_NOT_FOUND));
        
        recipe.setStatus("DELETED");
        recipe.setUpdateAt(LocalDateTime.now());
        recipeRepository.save(recipe);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void restoreRecipe(Integer recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new AppException(ErrorCode.RECIPE_NOT_FOUND));
        
        if (!"DELETED".equals(recipe.getStatus())) {
            throw new AppException(ErrorCode.RECIPE_NOT_DELETED);
        }
        
        recipe.setStatus("ACTIVE");
        recipe.setUpdateAt(LocalDateTime.now());
        recipeRepository.save(recipe);
    }
    
    /**
     * Lấy version tiếp theo cho recipe với tên và product detail cụ thể
     * Tìm version cao nhất (kể cả đã xóa) và trả về version + 1
     */
    public Integer getNextVersionForRecipe(String name, Integer pdId) {
        Integer maxVersion = recipeRepository.findMaxVersionByNameAndPdId(name, pdId);
        return maxVersion + 1;
    }

    /**
     * Lấy recipe theo product detail ID
     */
    @Transactional
    public Optional<Recipe> getRecipeByProductDetailId(Integer productDetailId) {
        log.debug("Getting recipe for product detail ID: {}", productDetailId);
        return recipeRepository.findByProductDetailPdIdAndStatus(productDetailId, "ACTIVE");
    }
    
    /**
     * Lấy tất cả recipe items theo recipe ID
     */
    @Transactional
    public List<RecipeItem> getRecipeItemsByRecipeId(Integer recipeId) {
        log.debug("Getting recipe items for recipe ID: {}", recipeId);
        return recipeItemRepository.findByRecipeRecipeId(recipeId);
    }
    
    /**
     * Tính toán nguyên liệu cần thiết cho một sản phẩm
     * @param productDetailId ID của product detail
     * @param quantity Số lượng sản phẩm cần làm
     * @return Map<ingredientId, requiredQuantity>
     */
    @Transactional
    public Map<Integer, BigDecimal> calculateRequiredIngredients(Integer productDetailId, BigDecimal quantity) {
        log.debug("Calculating required ingredients for product detail ID: {}, quantity: {}", productDetailId, quantity);
        
        // Lấy recipe
        Optional<Recipe> recipeOpt = getRecipeByProductDetailId(productDetailId);
        if (recipeOpt.isEmpty()) {
            log.warn("No active recipe found for product detail ID: {}", productDetailId);
            return Map.of();
        }

        Recipe recipe = recipeOpt.get();
        List<RecipeItem> recipeItems = getRecipeItemsByRecipeId(recipe.getRecipeId());
        
        if (recipeItems.isEmpty()) {
            log.warn("No recipe items found for recipe ID: {}", recipe.getRecipeId());
            return Map.of();
        }

        // Tính toán nguyên liệu cần thiết
        Map<Integer, BigDecimal> requiredIngredients = recipeItems.stream()
            .collect(Collectors.toMap(
                item -> item.getIngredient().getIngredientId(),
                item -> {
                    // Tính quantity cần thiết = (item.qty / recipe.yield) * quantity
                    BigDecimal requiredQty = item.getQty()
                        .divide(recipe.getYield(), 4, java.math.RoundingMode.HALF_UP)
                        .multiply(quantity);
                    
                    log.debug("Ingredient {}: recipe qty={}, yield={}, required qty={}", 
                        item.getIngredient().getIngredientId(), item.getQty(), recipe.getYield(), requiredQty);
                    
                    return requiredQty;
                }
            ));
        
        log.debug("Calculated required ingredients: {}", requiredIngredients);
        return requiredIngredients;
    }
    
    /**
     * Tính toán nguyên liệu cần thiết cho nhiều sản phẩm
     * @param items Map<productDetailId, quantity>
     * @return Map<ingredientId, totalRequiredQuantity>
     */
    @Transactional
    public Map<Integer, BigDecimal> calculateRequiredIngredientsForItems(Map<Integer, BigDecimal> items) {
        log.debug("Calculating required ingredients for items: {}", items);
        
        Map<Integer, BigDecimal> totalRequiredIngredients = new HashMap<>();
        
        for (Map.Entry<Integer, BigDecimal> entry : items.entrySet()) {
            Integer productDetailId = entry.getKey();
            BigDecimal quantity = entry.getValue();
            
            Map<Integer, BigDecimal> itemIngredients = calculateRequiredIngredients(productDetailId, quantity);
            
            // Cộng dồn vào total
            for (Map.Entry<Integer, BigDecimal> ingredient : itemIngredients.entrySet()) {
                Integer ingredientId = ingredient.getKey();
                BigDecimal requiredQty = ingredient.getValue();
                
                totalRequiredIngredients.merge(ingredientId, requiredQty, BigDecimal::add);
            }
        }
         log.debug("Total required ingredients: {}", totalRequiredIngredients);
        return totalRequiredIngredients;
    }
    
    /**
     * Kiểm tra xem có recipe cho product detail không
     */
    @Transactional
    public boolean hasRecipe(Integer productDetailId) {
        return getRecipeByProductDetailId(productDetailId).isPresent();
    }
    
    /**
 * Lấy thông tin chi tiết recipe với items
     */
@Transactional
    public Optional<Recipe> getRecipeWithItems(Integer productDetailId) {
        Optional<Recipe> recipeOpt = getRecipeByProductDetailId(productDetailId);
        if (recipeOpt.isPresent()) {
            Recipe recipe = recipeOpt.get();
            List<RecipeItem> items = getRecipeItemsByRecipeId(recipe.getRecipeId());
            // Set items vào recipe (nếu có relationship)
            return Optional.of(recipe);
        }
        return Optional.empty();
    }
}
