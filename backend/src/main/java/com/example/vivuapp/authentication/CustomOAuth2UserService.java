package com.example.vivuapp.authentication;

import com.example.vivuapp.entity.AccountAndAuthorization.Role;
import com.example.vivuapp.entity.AccountAndAuthorization.User;
import com.example.vivuapp.enums.Status;
import com.example.vivuapp.exception.exceptionImpl.ResourceNotFoundException;
import com.example.vivuapp.repository.AccountAndAuthorization.RoleRepository;
import com.example.vivuapp.repository.AccountAndAuthorization.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends OidcUserService { // Đổi từ DefaultOAuth2UserService sang OidcUserService

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        log.info("=== CustomOAuth2UserService.loadUser() (OIDC) được gọi ===");

        // Gọi super để lấy thông tin user chuẩn OIDC (bao gồm id_token)
        OidcUser oidcUser = super.loadUser(userRequest);
        log.info("OidcUser attributes: {}", oidcUser.getAttributes());

        String email = oidcUser.getEmail(); // OidcUser có sẵn method getEmail()
        if (email == null) {
            email = oidcUser.getAttribute("email"); // Fallback
        }
        log.info("Email from Google: {}", email);

        // Tìm hoặc Tạo User
        processUser(oidcUser, email);

        log.info("=== CustomOAuth2UserService.loadUser() hoàn thành ===");
        return oidcUser;
    }

    private void processUser(OidcUser oidcUser, String email) {
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            log.info("User không tồn tại, đang tạo user mới...");
            String firstName = oidcUser.getGivenName();
            String lastName = oidcUser.getFamilyName();

            // Xử lý trường hợp Google không trả về tên
            if(firstName == null) firstName = "User";
            if(lastName == null) lastName = "";

            log.info("First name: {}, Last name: {}", firstName, lastName);

            Role userRole = roleRepository.findByName("USER")
                    .orElseThrow(() -> new ResourceNotFoundException("Error: Role 'USER' is not found."));

            user = User.builder()
                    .firstName(firstName)
                    .lastName(lastName)
                    .email(email)
                    .username(email)
                    .password(null)
                    .status(Status.ACTIVE)
                    .roles(Set.of(userRole))
                    .createdBy(1L) // Lưu ý: Nên set logic động nếu có thể
                    .build();

            userRepository.save(user); // saveAndFlush không cần thiết nếu @Transactional hoạt động tốt
            log.info("User đã được lưu vào database.");
        } else {
            log.info("User đã tồn tại với ID: {}", user.getId());
            // Có thể cập nhật tên hoặc avatar ở đây nếu muốn
        }
    }
}