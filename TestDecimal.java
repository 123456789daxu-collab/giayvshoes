import java.math.BigDecimal;

public class TestDecimal {
    public static void main(String[] args) {
        BigDecimal giaBanThucTe = new BigDecimal("1700000.00");
        Integer discount = 10;
        BigDecimal giam = giaBanThucTe.multiply(BigDecimal.valueOf(discount)).divide(BigDecimal.valueOf(100));
        giaBanThucTe = giaBanThucTe.subtract(giam);
        System.out.println("giaBanThucTe: " + giaBanThucTe);
    }
}
