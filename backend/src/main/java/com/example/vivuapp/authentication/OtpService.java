package com.example.vivuapp.authentication;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Random;

    @Service
    @RequiredArgsConstructor
    public class OtpService {

        private final StringRedisTemplate redisTemplate;
        private final ObjectMapper objectMapper;

        private static final long OTP_EXPIRATION_MINUTES = 5;

        public String generateOtp() {
            Random random = new Random();
            int otp = 100000 + random.nextInt(900000);
            return String.valueOf(otp);
        }

        public <T> void saveData(String email, String otp, T request, String otpType) {
            try {
                String key = otpType + email;
                PendingData<T> data = new PendingData<>(otp, request);
                String json = objectMapper.writeValueAsString(data);
                redisTemplate.opsForValue().set(key, json, Duration.ofMinutes(OTP_EXPIRATION_MINUTES));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error serializing registration data", e);
            }
        }

        public <T> PendingData<T> getData(String email, Class<T> requestType, String otpType) {
            String key = otpType + email;
            String json = redisTemplate.opsForValue().get(key);
            if (json == null) {
                return null;
            }
            try {
                JavaType type = objectMapper.getTypeFactory().constructParametricType(PendingData.class, requestType);
                return objectMapper.readValue(json, type);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error deserializing registration data", e);
            }
        }

        public void clearData(String email, String otpType) {
            String key = otpType + email;
            redisTemplate.delete(key);
        }
    }