package org.film.management.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.Bill;

@ApplicationScoped
public class BillRepository implements PanacheRepositoryBase<Bill, String> {
}
