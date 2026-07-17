package org.film.management.controller;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.film.management.entity.Account;
import org.film.management.service.AccountService;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/accounts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AccountController {

    @Inject
    AccountService accountService;

    @GET
    @RolesAllowed("ADMIN")
    public List<Account> getAllAccounts() {
        return accountService.getAll();
    }

    @GET
    @Path("/my-profile")
    @RolesAllowed({"ADMIN", "CUSTOMER"})
    public Account getAccount() {
        return accountService.getById();
    }

    @PUT
    @Path("/update-profile")
    @RolesAllowed({"ADMIN", "CUSTOMER"})
    public Response updateProfile(Account account) {
        Account result = accountService.updateAccount(account);
        return result != null ? Response.ok(result).build() : Response.status(401).build();
    }

    @POST
    @Path("/{id}/toggle-active")
    @RolesAllowed("ADMIN")
    public void toggleActive(@PathParam("id") String id) {

        boolean updated = accountService.toggleActive(id);

        if (!updated) {
            throw new NotFoundException("Không tìm thấy tài khoản");
        }
    }
}