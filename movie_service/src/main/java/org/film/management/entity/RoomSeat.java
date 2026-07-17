package org.film.management.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Entity
@Data
@Builder
@Getter
@Setter
@Table(name = "room_seat")
@IdClass(RoomSeatId.class)
public class RoomSeat {
    @Id
    public String idRoom;

    @Id
    public String seatCode;

    public String typeSeat;
}