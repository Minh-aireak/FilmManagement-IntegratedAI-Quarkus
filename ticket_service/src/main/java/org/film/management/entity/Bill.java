package org.film.management.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "bill")
public class Bill {
    @Id
    public String idBill;
    public String idAccount;
    public LocalDateTime createdAt;
    public int totalAmount;
}
