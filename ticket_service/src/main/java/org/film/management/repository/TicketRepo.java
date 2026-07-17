package org.film.management.repository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.Ticket;

@ApplicationScoped
public class TicketRepo implements PanacheRepositoryBase<Ticket, String> {}