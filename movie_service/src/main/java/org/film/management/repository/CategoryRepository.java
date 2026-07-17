package org.film.management.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.Category;
import org.film.management.entity.Movie;

@ApplicationScoped
public class CategoryRepository implements PanacheRepositoryBase<Category, String> {

}
