package org.film.management.service;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.film.management.dto.AdminBillResponseDTO;
import org.film.management.dto.BookingRequest;
import org.film.management.dto.BookingResponseDTO;
import org.film.management.dto.PageResponse;
import org.film.management.dto.SeatStatusDTO;
import org.film.management.entity.*;
import org.film.management.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class BookingService {

    @Inject ShowtimeRepo showtimeRepo;
    @Inject ShowtimeSeatRepo showtimeSeatRepo;
    @Inject BillRepo billRepo;
    @Inject TicketRepo ticketRepo;
    @Inject MovieRepo movieRepo;
    @Inject JsonWebToken jwt;
    @Inject ShowtimePriceRepo showtimePriceRepo;
    @Inject RoomSeatRepo roomSeatRepo;

    public List<String> getBookedSeats(String idShowtime) {
        List<ShowtimeSeat> bookedEntries = showtimeSeatRepo
                .find("idShowtime = ?1 AND status = 'BOOKED'", idShowtime)
                .list();

        return bookedEntries.stream()
                .map(s -> s.seatCode) // Sử dụng seatCode
                .collect(Collectors.toList());
    }

    public List<SeatStatusDTO> getSeatStatuses(String idShowtime) {
        Showtime showtime = showtimeRepo.findById(idShowtime);
        if (showtime == null) throw new RuntimeException("Lá»‹ch chiáº¿u khÃ´ng há»£p lá»‡");

        ShowtimePrice priceConfig = showtimePriceRepo.findById(idShowtime);
        if (priceConfig == null) throw new RuntimeException("ChÆ°a cáº¥u hÃ¬nh giÃ¡ cho lá»‹ch chiáº¿u nÃ y");

        List<RoomSeat> roomSeats = roomSeatRepo.find("idRoom", showtime.idRoom).list();
        return roomSeats.stream()
                .map(roomSeat -> {
                    ShowtimeSeat showtimeSeat = showtimeSeatRepo.findById(new ShowtimeSeatId(idShowtime, roomSeat.seatCode));
                    String status = showtimeSeat != null ? showtimeSeat.status : "AVAILABLE";
                    return new SeatStatusDTO(
                            roomSeat.seatCode,
                            roomSeat.typeSeat,
                            status,
                            getTicketPrice(roomSeat.typeSeat, priceConfig)
                    );
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public BookingResponseDTO bookTickets(BookingRequest request) {
        Showtime showtime = showtimeRepo.findById(request.idShowtime);
        if (showtime == null) throw new RuntimeException("Lịch chiếu không hợp lệ");

        ShowtimePrice priceConfig = showtimePriceRepo.findById(request.idShowtime);
        if (priceConfig == null) throw new RuntimeException("Chưa cấu hình giá cho lịch chiếu này");

        Bill bill = new Bill();
        bill.idBill = "Bill_" + java.util.UUID.randomUUID();

        if (jwt != null && jwt.containsClaim("idAccount")) {
            bill.idAccount = jwt.getClaim("idAccount");
        }

        bill.createdAt = java.time.LocalDateTime.now();
        bill.totalAmount = 0;

        billRepo.persist(bill);

        int totalAmount = 0;
        java.util.List<Ticket> tickets = new java.util.ArrayList<>();

        for (String seatCode : request.seatCodes) {
            ShowtimeSeat checkSeat = showtimeSeatRepo.findById(new ShowtimeSeatId(request.idShowtime, seatCode));
            if (checkSeat != null && "BOOKED".equals(checkSeat.status)) {
                throw new RuntimeException("Ghế " + seatCode + " đã có người đặt!");
            }

            RoomSeat roomSeat = roomSeatRepo.findById(new RoomSeatId(showtime.idRoom, seatCode));
            if (roomSeat == null) throw new RuntimeException("Mã ghế " + seatCode + " không tồn tại trong phòng chiếu");

            int ticketPrice = getTicketPrice(roomSeat.typeSeat, priceConfig);

            totalAmount += ticketPrice;

            ShowtimeSeat newBookedSeat = new ShowtimeSeat();
            newBookedSeat.idShowtime = request.idShowtime;
            newBookedSeat.seatCode = seatCode;
            newBookedSeat.status = "BOOKED";
            showtimeSeatRepo.persist(newBookedSeat);

            Ticket ticket = new Ticket();
            ticket.idTicket = "Ticket_" + java.util.UUID.randomUUID();
            ticket.idShowtime = request.idShowtime;
            ticket.seatCode = seatCode;
            ticket.price = ticketPrice;
            ticket.idBill = bill.idBill;

            ticketRepo.persist(ticket);
            tickets.add(ticket);
        }

        bill.totalAmount = totalAmount;

        return new BookingResponseDTO(bill, tickets);
    }

    private int getTicketPrice(String typeSeat, ShowtimePrice priceConfig) {
        if ("STANDARD".equals(typeSeat)) return priceConfig.standardPrice;
        if ("VIP".equals(typeSeat)) return priceConfig.vipPrice;
        if ("COUPLE".equals(typeSeat)) return priceConfig.couplePrice;
        throw new RuntimeException("Loáº¡i gháº¿ khÃ´ng há»£p lá»‡: " + typeSeat);
    }

    public BookingResponseDTO getBillDetail(String idBill) {
        Bill bill = billRepo.findById(idBill);
        if (bill == null) {
            throw new RuntimeException("Không tìm thấy hóa đơn có mã: " + idBill);
        }

        String currentAccountId = jwt.getClaim("idAccount");

        boolean isAdmin = jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");

        if (!isAdmin && !bill.idAccount.equals(currentAccountId)) {
            throw new RuntimeException("Bạn không có quyền xem chi tiết hóa đơn của khách hàng khác!");
        }
        List<Ticket> tickets = ticketRepo.find("idBill", idBill).list();
        return new BookingResponseDTO(bill, tickets);
    }

    public List<Bill> getMyBookingHistory() {
        String currentAccountId = jwt.getClaim("idAccount");
        if (currentAccountId == null) {
            throw new RuntimeException("Không thể xác thực danh tính.");
        }
        return billRepo.find("idAccount", currentAccountId).list();
    }

    @Transactional
    public void cancelBill(String idBill) {
        String currentAccountId = jwt.getClaim("idAccount");
        if (currentAccountId == null) {
            throw new RuntimeException("Không thể xác thực danh tính từ Token.");
        }

        Bill bill = billRepo.findById(idBill);
        if (bill == null) throw new RuntimeException("Hóa đơn không tồn tại");


        boolean isAdmin = jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");

        if (!isAdmin && !currentAccountId.equals(bill.idAccount)) {
            throw new RuntimeException("Bạn không có quyền xóa hóa đơn của người khác!");
        }

        List<Ticket> tickets = ticketRepo.find("idBill", idBill).list();
        if (tickets.isEmpty()) throw new RuntimeException("Không tìm thấy vé trong hóa đơn");

        String idShowtime = tickets.get(0).idShowtime;
        Showtime showtime = showtimeRepo.findById(idShowtime);
        if (showtime != null) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime cancellationDeadline = showtime.showTime.minusHours(1);
            if (now.isAfter(cancellationDeadline)) {
                throw new RuntimeException("Đã quá thời hạn hủy vé! Bạn chỉ có thể hủy tối thiểu 1 giờ trước giờ chiếu.");
            }
        }

        for (Ticket tk : tickets) {
            ticketRepo.delete(tk);

            ShowtimeSeatId seatId = new ShowtimeSeatId(tk.idShowtime, tk.seatCode);
            showtimeSeatRepo.deleteById(seatId);
        }

        billRepo.delete(bill);
    }

    public PageResponse<AdminBillResponseDTO> getAllBillsForAdmin(int page, int size, String searchTerm, String idMovie, String idShowtime) {
        StringBuilder queryStr = new StringBuilder("SELECT b FROM Bill b WHERE 1=1");
        java.util.Map<String, Object> params = new java.util.HashMap<>();

        if (searchTerm != null && !searchTerm.isEmpty()) {
            queryStr.append(" AND (b.idBill LIKE :searchTerm OR b.idAccount LIKE :searchTerm)");
            params.put("searchTerm", "%" + searchTerm + "%");
        }

        if (idShowtime != null && !idShowtime.equals("all")) {
            queryStr.append(" AND b.idBill IN (SELECT t.idBill FROM Ticket t WHERE t.idShowtime = :idShowtime)");
            params.put("idShowtime", idShowtime);
        } else if (idMovie != null && !idMovie.equals("all")) {
            queryStr.append(" AND b.idBill IN (SELECT t.idBill FROM Ticket t WHERE t.idShowtime IN (SELECT s.idShowtime FROM Showtime s WHERE s.idMovie = :idMovie))");
            params.put("idMovie", idMovie);
        }

        queryStr.append(" ORDER BY b.createdAt DESC");

        PanacheQuery<Bill> query = billRepo.find(queryStr.toString(), params);
        
        List<Bill> billList = query.page(Page.of(page, size)).list();
        
        List<AdminBillResponseDTO> data = billList.stream().map(bill -> {
            List<Ticket> tickets = ticketRepo.find("idBill", bill.idBill).list();
            String movieName = "Phim không xác định";
            LocalDateTime showTime = null;
            
            if (!tickets.isEmpty()) {
                String idShowtimeFromTicket = tickets.get(0).idShowtime;
                Showtime showtime = showtimeRepo.findById(idShowtimeFromTicket);
                if (showtime != null) {
                    showTime = showtime.showTime;
                    Movie movie = movieRepo.findById(showtime.idMovie);
                    if (movie != null) {
                        movieName = movie.nameMovie;
                    }
                }
            }
            
            return new AdminBillResponseDTO(bill, tickets, movieName, showTime);
        }).collect(Collectors.toList());
        
        return PageResponse.<AdminBillResponseDTO>builder()
                .currentPage(page)
                .pageSize(size)
                .totalPages(query.pageCount())
                .totalElement(query.count())
                .data(data)
                .build();
    }

}
