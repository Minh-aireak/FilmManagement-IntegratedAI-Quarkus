package org.film.management.controller;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String password;
}
