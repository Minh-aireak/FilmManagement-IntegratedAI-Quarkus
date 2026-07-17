package org.film.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageResponse<T> {
    int currentPage;
    int totalPages;
    int pageSize;
    long totalElement;

    @Builder.Default
    List<T> data = Collections.emptyList();
}
