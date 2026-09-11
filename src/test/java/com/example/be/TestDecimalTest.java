package com.example.be;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

public class TestDecimalTest {

    @Test
    void testDiscountCalculation() {
        BigDecimal giaBanThucTe = new BigDecimal("1700000.00");
        Integer discount = 10;
        BigDecimal giam = giaBanThucTe.multiply(BigDecimal.valueOf(discount)).divide(BigDecimal.valueOf(100));
        giaBanThucTe = giaBanThucTe.subtract(giam);

        Assertions.assertEquals(new BigDecimal("1530000.00"), giaBanThucTe);
    }
}
