package org.film.management.entity;

import java.io.Serializable;
import java.util.Objects;

public class ShowtimeSeatId implements Serializable {
    public String idShowtime;
    public String seatCode;

    public ShowtimeSeatId() {}

    public ShowtimeSeatId(String idShowtime, String seatCode) {
        this.idShowtime = idShowtime;
        this.seatCode = seatCode;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ShowtimeSeatId that = (ShowtimeSeatId) o;
        return Objects.equals(idShowtime, that.idShowtime) &&
                Objects.equals(seatCode, that.seatCode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idShowtime, seatCode);
    }
}