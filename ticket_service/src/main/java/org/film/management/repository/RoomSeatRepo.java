package org.film.management.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.RoomSeat;
import org.film.management.entity.RoomSeatId;

@ApplicationScoped
public class RoomSeatRepo implements PanacheRepositoryBase<RoomSeat, RoomSeatId> {
}