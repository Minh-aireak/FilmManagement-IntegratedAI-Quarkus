package org.film.management.service;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.film.management.dto.request.AddShowtimeRequest;
import org.film.management.dto.response.PageResponse;
import org.film.management.dto.response.ShowtimeResponse;
import org.film.management.entity.*;
import org.film.management.exception.AppException;
import org.film.management.exception.ErrorCode;
import org.film.management.repository.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class ShowtimeService {

    @Inject
    MovieRepository movieRepository;

    @Inject
    ShowtimeRepository showtimeRepository;

    @Inject
    ShowtimePriceRepository showtimePriceRepository;

    @Inject
    RoomSeatRepository roomSeatRepository;

    @Inject
    ShowtimeSeatRepository showtimeSeatRepository;

    @Inject
    TicketRepository ticketRepository;

    public PageResponse<ShowtimeResponse> getShowtimesByMovie(String idMovie, int page, int size) {
        if (page < 0 || size <= 0) {
            throw new AppException(ErrorCode.INVALID_PAGE);
        }

        Movie movie = movieRepository.findByIdOptional(idMovie)
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));

        PanacheQuery<Showtime> query = showtimeRepository
                .find("idMovie = ?1 order by showTime desc", idMovie)
                .page(Page.of(page, size));

        List<ShowtimeResponse> data = query.list().stream()
                .map(st -> ShowtimeResponse.builder()
                        .idShowtime(st.idShowtime)
                        .showTime(st.showTime)
                        .idMovie(st.idMovie)
                        .idRoom(st.idRoom)
                        .movieName(movie.getNameMovie())
                        .movieImage(movie.getImage())
                        .build())
                .collect(Collectors.toList());

        return PageResponse.<ShowtimeResponse>builder()
                .currentPage(page)
                .pageSize(size)
                .totalPages(query.pageCount())
                .totalElement(query.count())
                .data(data)
                .build();
    }

    public PageResponse<ShowtimeResponse> getAllShowtimes(int page, int size, String status, String idMovie, String date, String idRoom) {
        if (page < 0 || size <= 0) {
            throw new AppException(ErrorCode.INVALID_PAGE);
        }

        StringBuilder queryBuilder = new StringBuilder();
        java.util.Map<String, Object> params = new java.util.HashMap<>();
        LocalDateTime now = LocalDateTime.now();

        if ("upcoming".equalsIgnoreCase(status)) {
            queryBuilder.append("showTime > :now");
            params.put("now", now);
        } else if ("past".equalsIgnoreCase(status)) {
            queryBuilder.append("showTime <= :now");
            params.put("now", now);
        } else if ("all".equalsIgnoreCase(status)) {
            queryBuilder.append("1=1");
        } else {
            throw new AppException(ErrorCode.STATUS_SHOWTIME);
        }

        if (idMovie != null && !idMovie.isEmpty() && !idMovie.equalsIgnoreCase("all")) {
            queryBuilder.append(" AND idMovie = :idMovie");
            params.put("idMovie", idMovie);
        }

        if (idRoom != null && !idRoom.isEmpty() && !idRoom.equalsIgnoreCase("all")) {
            queryBuilder.append(" AND idRoom = :idRoom");
            params.put("idRoom", idRoom);
        }

        if (date != null && !date.isEmpty()) {
            try {
                java.time.LocalDate localDate = java.time.LocalDate.parse(date);
                LocalDateTime startOfDay = localDate.atStartOfDay();
                LocalDateTime endOfDay = localDate.atTime(23, 59, 59);
                queryBuilder.append(" AND showTime >= :startOfDay AND showTime <= :endOfDay");
                params.put("startOfDay", startOfDay);
                params.put("endOfDay", endOfDay);
            } catch (Exception e) {
                // Ignore invalid date format
            }
        }

        String orderBy = " ORDER BY showTime DESC";
        PanacheQuery<Showtime> query = showtimeRepository.find(queryBuilder.toString() + orderBy, params);
        query.page(Page.of(page, size));

        List<ShowtimeResponse> data = query.list().stream()
                .map(st -> {
                    Movie movie = movieRepository.findById(st.idMovie);
                    return ShowtimeResponse.builder()
                            .idShowtime(st.idShowtime)
                            .showTime(st.showTime)
                            .idMovie(st.idMovie)
                            .idRoom(st.idRoom)
                            .movieName(movie != null ? movie.getNameMovie() : "Phim không xác định")
                            .movieImage(movie != null ? movie.getImage() : null)
                            .build();
                })
                .collect(Collectors.toList());

        return PageResponse.<ShowtimeResponse>builder()
                .currentPage(page)
                .pageSize(size)
                .totalPages(query.pageCount())
                .totalElement(query.count())
                .data(data)
                .build();
    }

    @Transactional
    public Showtime createShowtime(AddShowtimeRequest request) {
        String idShowtime = "Showtime_" + UUID.randomUUID();

        Showtime showtime = Showtime.builder()
                .idShowtime(idShowtime)
                .idMovie(request.idMovie)
                .idRoom(request.idRoom)
                .showTime(request.showTime)
                .build();

        showtimeRepository.persist(showtime);

        ShowtimePrice price = ShowtimePrice.builder()
                .idShowtime(idShowtime)
                .standardPrice(request.standardPrice)
                .vipPrice(request.vipPrice)
                .couplePrice(request.couplePrice)
                .build();

        showtimePriceRepository.persist(price);

        List<RoomSeat> roomSeats = roomSeatRepository.find("idRoom", request.idRoom).list();

        for (RoomSeat rs : roomSeats) {
            ShowtimeSeat stSeat = ShowtimeSeat.builder()
                    .idShowtime(idShowtime)
                    .seatCode(rs.seatCode)
                    .status("AVAILABLE")
                    .build();
            showtimeSeatRepository.persist(stSeat);
        }

        return showtime;
    }

    @Transactional
    public void deleteShowtime(String idShowtime) {
        Showtime showtime = showtimeRepository.findById(idShowtime);
        if (showtime == null) throw new RuntimeException("Lịch chiếu không tồn tại");
        long ticketCount = ticketRepository.find("idShowtime", idShowtime).count();
        if (ticketCount > 0) {
            throw new AppException(ErrorCode.DELETE_SHOWTIME);
        }
        showtimeSeatRepository.delete("idShowtime", idShowtime);
        showtimePriceRepository.deleteById(idShowtime);
        showtimeRepository.delete(showtime);
    }
}