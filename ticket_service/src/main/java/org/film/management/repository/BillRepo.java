package org.film.management.repository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.Bill;

@ApplicationScoped
public class BillRepo implements PanacheRepositoryBase<Bill, String> {}