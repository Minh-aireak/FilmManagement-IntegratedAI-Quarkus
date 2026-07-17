package org.film.management.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.film.management.entity.Category;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MovieRequest {
   @NotNull(message = "The movie name cannot be null!")
   @NotBlank(message = "The movie name cannot be blank!")
   String nameMovie;

   @NotNull(message = "The author's name cannot be null!")
   @NotBlank(message = "The author's name cannot be blank!")
   String author;

   @NotNull(message = "The actor's name cannot be null!")
   @NotBlank(message = "The actor's name cannot be blank!")
   String actors;

   @NotNull(message = "The movie's duration cannot be null!")
   @NotBlank(message = "The movie's duration cannot be blank!")
   String duration;

   @NotNull(message = "The movie's language cannot be null!")
   @NotBlank(message = "The movie's language cannot be blank!")
   String language;

   @NotNull(message = "The movie's description cannot be null!")
   @NotBlank(message = "The movie's description cannot be blank!")
   String description;

   @NotNull(message = "The movie's image cannot be null!")
   @NotBlank(message = "The movie's image cannot be blank!")
   String image;

   @NotNull(message = "The movie's category cannot be null!")
   List<Category> idCategories;
}
