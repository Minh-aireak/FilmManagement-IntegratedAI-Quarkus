package org.film.management.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import org.film.management.entity.Room;
import org.film.management.repository.RoomRepository;

import java.util.List;

@Slf4j
@ApplicationScoped
public class RoomService {

    @Inject
    RoomRepository roomRepository;

    public List<Room> getAllRooms() {
        return roomRepository.listAll();
    }
}