package org.film.management.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.Movie;

@ApplicationScoped
public class MovieRepo implements PanacheRepositoryBase<Movie, String> { }