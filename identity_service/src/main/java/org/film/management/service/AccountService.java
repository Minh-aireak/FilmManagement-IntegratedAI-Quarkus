package org.film.management.service;

import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.film.management.entity.Account;
import org.film.management.repository.AccountRepository;
import org.film.management.controller.LoginResponse;
import org.film.management.controller.LoginRequest;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class AccountService {

    @Inject
    AccountRepository accountRepository;
    @Inject
    JsonWebToken jwt;

    public String getCurrentId() {
        return jwt.getClaim("idAccount");
    }

    public LoginResponse authenticate(LoginRequest credentials) throws Exception {
        Account account = accountRepository.findByEmail(credentials.getEmail());

        if (account == null) {
            return null;
        }

        if (!account.isActive())
            throw new Exception("Account was disable!");

        if (!BcryptUtil.matches(credentials.getPassword(), account.getPassword())) {
            return null;
        }

        Set<String> roles = new HashSet<>();
        String roleName = account.getRole().name();
        roles.add(roleName);

        String token = Jwt.issuer("https://film-management.org/issuer")
                .upn(account.getEmail())
                .groups(roles)
                .claim("idAccount", account.getIdAccount())
                .claim("fullName", account.getFirstName() + " " + account.getLastName())
                .expiresIn(3600)
                .sign();

        return new LoginResponse(token, roleName, account.getFirstName() + " " + account.getLastName());
    }

    @Transactional
    public boolean register(Account newAccount) {
        if (accountRepository.findByEmail(newAccount.getEmail()) != null) {
            return false;
        }

        newAccount.setRole(org.film.management.entity.Role.CUSTOMER);
        if (newAccount.getIdAccount() == null || newAccount.getIdAccount().trim().isEmpty()) {
            newAccount.setIdAccount("TK_" + UUID.randomUUID().toString().substring(0, 8));
        }

        newAccount.setPassword(BcryptUtil.bcryptHash(newAccount.getPassword()));
        accountRepository.persist(newAccount);
        return true;
    }

    public List<Account> getAll() {
        return accountRepository.listAll();
    }

    public Account getById() {
        return accountRepository.findById(getCurrentId());
    }

    @Transactional
    public Account updateAccount(Account updatedData) {
        String id = getCurrentId();
        if (id == null) return null;

        Account entity = accountRepository.findById(id);
        if (entity != null) {
            entity.setFirstName(updatedData.getFirstName());
            entity.setLastName(updatedData.getLastName());
            entity.setPhone(updatedData.getPhone());
            entity.setDateOfBirth(updatedData.getDateOfBirth());
            entity.setAddress(updatedData.getAddress());
            entity.setGender(updatedData.getGender());
        }
        return entity;
    }

    @Transactional
    public boolean toggleActive(String id) {

        Account account = accountRepository.findByIdOptional(id)
                .orElse(null);

        if (account == null) {
            return false;
        }

        account.setActive(!account.isActive());

        return true;
    }
}