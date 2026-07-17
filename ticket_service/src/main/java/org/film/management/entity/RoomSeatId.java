package org.film.management.entity;

import java.io.Serializable;
import java.util.Objects;

public class RoomSeatId implements Serializable {
    public String idRoom;
    public String seatCode;

    public RoomSeatId() {}

    public RoomSeatId(String idRoom, String seatCode) {
        this.idRoom = idRoom;
        this.seatCode = seatCode;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RoomSeatId that = (RoomSeatId) o;
        return Objects.equals(idRoom, that.idRoom) &&
                Objects.equals(seatCode, that.seatCode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idRoom, seatCode);
    }
}