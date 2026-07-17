package org.film.management.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.film.management.dto.response.DashboardStatsResponse;
import org.film.management.entity.Room;
import org.film.management.repository.RoomRepository;

import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
public class StatService {

    @Inject
    RoomRepository roomRepository;

    @Inject
    EntityManager entityManager;

    public List<Room> getAllRooms() {
        return roomRepository.listAll();
    }

    public DashboardStatsResponse getDashboardStats(int month, int year) {
        // 1. Thống kê số phim có suất chiếu trong tháng/năm
        Long totalMovies = (Long) entityManager.createQuery(
                "SELECT COUNT(DISTINCT s.idMovie) FROM Showtime s " +
                        "WHERE MONTH(s.showTime) = :month AND YEAR(s.showTime) = :year")
                .setParameter("month", month)
                .setParameter("year", year)
                .getSingleResult();

        // 2. Thống kê tổng số vé đã bán trong tháng/năm (dựa trên Bill)
        Long totalTickets = (Long) entityManager.createQuery(
                "SELECT COUNT(t) FROM Ticket t WHERE t.idBill IN " +
                        "(SELECT b.idBill FROM Bill b WHERE MONTH(b.createdAt) = :month AND YEAR(b.createdAt) = :year)")
                .setParameter("month", month)
                .setParameter("year", year)
                .getSingleResult();

        // 3. Thống kê tổng doanh thu trong tháng/năm
        Long totalRevenue = (Long) entityManager.createQuery(
                "SELECT SUM(b.totalAmount) FROM Bill b " +
                        "WHERE MONTH(b.createdAt) = :month AND YEAR(b.createdAt) = :year")
                .setParameter("month", month)
                .setParameter("year", year)
                .getSingleResult();

        // 4. Thống kê top 5 phim xem nhiều nhất
        List<Object[]> topMoviesRaw = entityManager.createQuery(
                "SELECT m.nameMovie, m.image, COUNT(t.idTicket) as ticketCount, m.idMovie " +
                        "FROM Ticket t " +
                        "JOIN Showtime s ON t.idShowtime = s.idShowtime " +
                        "JOIN Movie m ON s.idMovie = m.idMovie " +
                        "WHERE t.idBill IN (SELECT b.idBill FROM Bill b WHERE MONTH(b.createdAt) = :month AND YEAR(b.createdAt) = :year) " +
                        "GROUP BY m.idMovie, m.nameMovie, m.image " +
                        "ORDER BY ticketCount DESC", Object[].class)
                .setParameter("month", month)
                .setParameter("year", year)
                .setMaxResults(5)
                .getResultList();

        List<DashboardStatsResponse.MovieStat> topMovies = topMoviesRaw.stream()
                .map(row -> DashboardStatsResponse.MovieStat.builder()
                        .movieName((String) row[0])
                        .image((String) row[1])
                        .ticketCount((Long) row[2])
                        .idMovie((String) row[3])
                        .build())
                .collect(Collectors.toList());

        // 5. Thống kê khung giờ phổ biến
        List<Object[]> topTimeSlotsRaw = entityManager.createQuery(
                "SELECT " +
                        "CASE " +
                        "  WHEN HOUR(b.createdAt) >= 8 AND HOUR(b.createdAt) < 12 THEN 'Sáng (08:00 - 12:00)' " +
                        "  WHEN HOUR(b.createdAt) >= 12 AND HOUR(b.createdAt) < 17 THEN 'Chiều (12:00 - 17:00)' " +
                        "  WHEN HOUR(b.createdAt) >= 17 AND HOUR(b.createdAt) < 22 THEN 'Tối (17:00 - 22:00)' " +
                        "  ELSE 'Khuya (22:00 - 01:00)' " +
                        "END as slot, " +
                        "COUNT(b) as count " +
                        "FROM Bill b " +
                        "WHERE MONTH(b.createdAt) = :month AND YEAR(b.createdAt) = :year " +
                        "GROUP BY slot " +
                        "ORDER BY count DESC", Object[].class)
                .setParameter("month", month)
                .setParameter("year", year)
                .getResultList();

        List<DashboardStatsResponse.TimeSlotStat> topTimeSlots = topTimeSlotsRaw.stream()
                .map(row -> DashboardStatsResponse.TimeSlotStat.builder()
                        .label((String) row[0])
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());

        return DashboardStatsResponse.builder()
                .totalMovies(totalMovies.intValue())
                .totalTickets(totalTickets.intValue())
                .totalRevenue(totalRevenue != null ? totalRevenue.intValue() : 0)
                .topMovies(topMovies)
                .topTimeSlots(topTimeSlots)
                .build();
    }
}