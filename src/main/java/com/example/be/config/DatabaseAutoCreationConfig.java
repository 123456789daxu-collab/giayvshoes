package com.example.be.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tự động kiểm tra và khởi tạo Database trên SQL Server nếu chưa tồn tại
 * trước khi Spring Boot DataSource / Hibernate kết nối vào database.
 */
@Component
public class DatabaseAutoCreationConfig implements BeanFactoryPostProcessor, EnvironmentAware {

    private static final AtomicBoolean initialized = new AtomicBoolean(false);
    private static Environment environment;

    @Override
    public void setEnvironment(Environment env) {
        environment = env;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        ensureDatabaseExists();
    }

    /**
     * Phương thức khởi tạo database chạy sớm nhất có thể.
     * Được gọi trực tiếp trong main() hoặc thông qua BeanFactoryPostProcessor.
     */
    public static synchronized void ensureDatabaseExists() {
        if (initialized.get()) {
            return;
        }

        String rawUrl = null;
        String username = null;
        String password = null;
        String driver = null;

        // 1. Ưu tiên lấy từ Spring Environment nếu đã được nạp
        if (environment != null) {
            rawUrl = environment.getProperty("spring.datasource.url");
            username = environment.getProperty("spring.datasource.username");
            password = environment.getProperty("spring.datasource.password");
            driver = environment.getProperty("spring.datasource.driver-class-name");
        }

        // 2. Dự phòng: Đọc trực tiếp từ application.properties trong classpath
        if (rawUrl == null || rawUrl.isEmpty()) {
            Properties props = new Properties();
            try (InputStream is = DatabaseAutoCreationConfig.class.getClassLoader().getResourceAsStream("application.properties")) {
                if (is != null) {
                    props.load(is);
                    rawUrl = props.getProperty("spring.datasource.url");
                    username = props.getProperty("spring.datasource.username");
                    password = props.getProperty("spring.datasource.password");
                    driver = props.getProperty("spring.datasource.driver-class-name");
                }
            } catch (Exception e) {
                System.err.println("[DatabaseAutoCreation] Không thể đọc application.properties: " + e.getMessage());
            }
        }

        // 3. Dự phòng qua System Properties hoặc Environment Variables
        if (rawUrl == null) rawUrl = System.getProperty("spring.datasource.url", System.getenv("SPRING_DATASOURCE_URL"));
        if (username == null) username = System.getProperty("spring.datasource.username", System.getenv("SPRING_DATASOURCE_USERNAME"));
        if (password == null) password = System.getProperty("spring.datasource.password", System.getenv("SPRING_DATASOURCE_PASSWORD"));
        if (driver == null) driver = "com.microsoft.sqlserver.jdbc.SQLServerDriver";

        if (rawUrl == null || !rawUrl.contains("sqlserver")) {
            return;
        }

        // 4. Trích xuất tên database đích (ví dụ VSHOES)
        Pattern pattern = Pattern.compile("(?i)[;?](?:databaseName|database)=([^;?&]+)");
        Matcher matcher = pattern.matcher(rawUrl);
        String targetDbName = "VSHOES";
        String masterUrl = rawUrl;

        if (matcher.find()) {
            targetDbName = matcher.group(1);
            // Thay thế databaseName=<target> thành databaseName=master để kết nối vào CSDL gốc của SQL Server
            masterUrl = matcher.replaceFirst(";databaseName=master");
        } else {
            masterUrl = rawUrl + ";databaseName=master";
        }

        System.out.println("================================================================================");
        System.out.println("[DatabaseAutoCreation] Đang kiểm tra Database: [" + targetDbName + "] trên SQL Server...");

        try {
            Class.forName(driver);
            try (Connection conn = DriverManager.getConnection(masterUrl, username, password);
                 Statement stmt = conn.createStatement()) {

                // Script kiểm tra và tạo CSDL nếu chưa có
                String sql = "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'" + targetDbName + "')\n" +
                             "BEGIN\n" +
                             "    CREATE DATABASE [" + targetDbName + "];\n" +
                             "    PRINT 'Database " + targetDbName + " created successfully';\n" +
                             "END";

                stmt.execute(sql);
                System.out.println("[DatabaseAutoCreation] CSDL [" + targetDbName + "] đã sẵn sàng!");
                System.out.println("================================================================================");
                initialized.set(true);
            }
        } catch (Exception e) {
            System.err.println("[DatabaseAutoCreation] Cảnh báo kết nối master: " + e.getMessage());
            System.err.println("[DatabaseAutoCreation] Hãy chắc chắn SQL Server đang chạy ở cổng tương ứng.");
            System.out.println("================================================================================");
        }
    }
}
