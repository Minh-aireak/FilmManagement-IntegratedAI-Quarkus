package org.film.management.dto;

import java.util.Collections;
import java.util.List;

public class PageResponse<T> {
    private int currentPage;
    private int totalPages;
    private int pageSize;
    private long totalElement;
    private List<T> data = Collections.emptyList();

    public PageResponse() {}

    public PageResponse(int currentPage, int totalPages, int pageSize, long totalElement, List<T> data) {
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.pageSize = pageSize;
        this.totalElement = totalElement;
        this.data = data;
    }

    // Getters and Setters
    public int getCurrentPage() { return currentPage; }
    public void setCurrentPage(int currentPage) { this.currentPage = currentPage; }
    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
    public int getPageSize() { return pageSize; }
    public void setPageSize(int pageSize) { this.pageSize = pageSize; }
    public long getTotalElement() { return totalElement; }
    public void setTotalElement(long totalElement) { this.totalElement = totalElement; }
    public List<T> getData() { return data; }
    public void setData(List<T> data) { this.data = data; }

    public static <T> PageResponseBuilder<T> builder() {
        return new PageResponseBuilder<>();
    }

    public static class PageResponseBuilder<T> {
        private int currentPage;
        private int totalPages;
        private int pageSize;
        private long totalElement;
        private List<T> data;

        public PageResponseBuilder<T> currentPage(int currentPage) { this.currentPage = currentPage; return this; }
        public PageResponseBuilder<T> totalPages(int totalPages) { this.totalPages = totalPages; return this; }
        public PageResponseBuilder<T> pageSize(int pageSize) { this.pageSize = pageSize; return this; }
        public PageResponseBuilder<T> totalElement(long totalElement) { this.totalElement = totalElement; return this; }
        public PageResponseBuilder<T> data(List<T> data) { this.data = data; return this; }

        public PageResponse<T> build() {
            return new PageResponse<>(currentPage, totalPages, pageSize, totalElement, data);
        }
    }
}
