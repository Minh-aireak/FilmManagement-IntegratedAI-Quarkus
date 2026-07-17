package org.film.management.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.Account;

@ApplicationScoped
public class AccountRepository implements PanacheRepositoryBase<Account, String> {

    public Account findByEmail(String email) {
        return find("email", email).firstResult();
    }
}