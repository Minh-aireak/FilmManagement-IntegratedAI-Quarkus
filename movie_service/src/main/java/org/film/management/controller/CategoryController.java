package org.film.management.controller;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.film.management.dto.response.ApiResponse;
import org.film.management.entity.Category;
import org.film.management.service.CategoryService;

import java.util.List;

@Path("/categories")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CategoryController {
    @Inject
    CategoryService categoryService;

    @GET
    public ApiResponse<List<Category>> getCategories() {

        return ApiResponse.<List<Category>>builder()
                .message("Get categories successfully!")
                .result(categoryService.getCategories())
                .build();

    }

    @POST
    @RolesAllowed("ADMIN")
    public ApiResponse<Void> createCategory(@QueryParam("idCategory") String idCategory) {

        categoryService.createCategory(idCategory);

        return ApiResponse.<Void>builder()
                .message("Create category successfully!")
                .build();
    }

    @DELETE
    @RolesAllowed("ADMIN")
    public ApiResponse<Void> deleteCategory(@QueryParam("idCategory") String idCategory) {

        categoryService.deleteCategory(idCategory);

        return ApiResponse.<Void>builder()
                .message("Delete category successfully!")
                .build();
    }
}
