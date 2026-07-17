package org.film.management.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "movie")
public class Movie {
    @Id
    public String idMovie;

    public String nameMovie;
    public String author;
    public String actors;
    public String duration;
    public String language;
    public String description;
    public String image;
    public LocalDateTime createdAt;
}