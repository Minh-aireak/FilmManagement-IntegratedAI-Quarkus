package org.film.management.dto;

public class SeatStatusDTO {
    public String seatCode;
    public String typeSeat;
    public String status;
    public int price;

    public SeatStatusDTO(String seatCode, String typeSeat, String status, int price) {
        this.seatCode = seatCode;
        this.typeSeat = typeSeat;
        this.status = status;
        this.price = price;
    }
}
