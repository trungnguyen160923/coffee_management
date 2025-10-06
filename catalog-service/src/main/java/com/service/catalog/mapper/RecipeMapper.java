package com.service.catalog.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.service.catalog.dto.request.recipe.RecipeCreationRequest;
import com.service.catalog.dto.request.recipe.RecipeUpdateRequest;
import com.service.catalog.dto.response.RecipeResponse;
import com.service.catalog.entity.ProductDetail;
import com.service.catalog.entity.Recipe;

@Mapper(componentModel = "spring", uses = {RecipeItemMapper.class, ProductDetailMapper.class, CategoryMapper.class, IngredientMapper.class, UnitMapper.class})
public interface RecipeMapper {

    // Map productDetail directly; category can still be derived from productDetail.product.category
    @Mapping(target = "productDetail", source = "productDetail")
    @Mapping(target = "category", source = "productDetail.product.category")
    RecipeResponse toRecipeResponse(Recipe recipe);

    @Mapping(target = "productDetail", source = "pdId", qualifiedByName = "pdIdToProductDetail")
    Recipe toRecipe(RecipeCreationRequest request);

    Recipe toRecipe(RecipeUpdateRequest request);

    @Named("pdIdToProductDetail")
    public static ProductDetail pdIdToProductDetail(Integer pdId) {
        if (pdId == null) return null;
        ProductDetail pd = new ProductDetail();
        pd.setPdId(pdId);
        return pd;
    }
}
