package org.film.management.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.Account;
import org.film.management.entity.Role;

import java.util.List;

@ApplicationScoped
public class AccountRepository implements PanacheRepositoryBase<Account, String> {

    public Account findByEmail(String email) {
        return find("email", email).firstResult();
    }

    public List<Account> findCustomers() {
        return list("role", Role.CUSTOMER);
    }
}
