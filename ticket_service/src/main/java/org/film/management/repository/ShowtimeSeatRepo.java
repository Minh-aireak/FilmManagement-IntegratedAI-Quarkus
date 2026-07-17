package org.film.management.repository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.ShowtimeSeat;
import org.film.management.entity.ShowtimeSeatId;

@ApplicationScoped
public class ShowtimeSeatRepo implements PanacheRepositoryBase<ShowtimeSeat, ShowtimeSeatId> {}