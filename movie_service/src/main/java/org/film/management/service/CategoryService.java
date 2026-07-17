package org.film.management.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.film.management.entity.Category;
import org.film.management.exception.AppException;
import org.film.management.exception.ErrorCode;
import org.film.management.repository.CategoryRepository;
import org.film.management.repository.MovieRepository;

import java.util.List;

@Slf4j
@ApplicationScoped
public class CategoryService {

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    MovieRepository movieRepository;

    @Transactional
    public void createCategory(String idCategory) {

        Category category = categoryRepository.findById(idCategory);

        if (category != null) {
            throw new AppException(ErrorCode.CATEGORY_EXISTED);
        }

        categoryRepository.persist(new Category(idCategory));
    }

    public List<Category> getCategories() {
        return categoryRepository.listAll();
    }

    @Transactional
    public void deleteCategory(String idCategory) {

        Category existed = categoryRepository.findById(idCategory);

        if (existed == null) {
            throw new AppException(ErrorCode.CATEGORY_NOT_EXIST);
        }

        long count = movieRepository.count(
                "from Movie m join m.categories c where c.idCategory = ?1",
                idCategory
        );

        if (count > 0) {
            throw new AppException(ErrorCode.CATEGORY_IS_IN_USE);
        }

        categoryRepository.deleteById(idCategory);
    }
}