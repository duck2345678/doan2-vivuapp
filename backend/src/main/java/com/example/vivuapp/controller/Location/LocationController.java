package com.example.vivuapp.controller.Location;

import com.example.vivuapp.dto.ApiResponse;
import com.example.vivuapp.dto.reponse.PlaceAndMapping.DistrictResponse;
import com.example.vivuapp.dto.reponse.PlaceAndMapping.ProvinceResponse;
import com.example.vivuapp.dto.reponse.PlaceAndMapping.WardResponse;
import com.example.vivuapp.service.Location.LocationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/locations")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LocationController {

    LocationService locationService;

    /**
     * GET /api/v1/locations/provinces - Public endpoint to list all provinces
     */
    @GetMapping("/provinces")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<ProvinceResponse>> getAllProvinces() {
        List<ProvinceResponse> provinces = locationService.getAllProvinces();
        return ApiResponse.<List<ProvinceResponse>>builder()
                .code(200)
                .message("Provinces retrieved successfully")
                .result(provinces)
                .build();
    }

    /**
     * GET /api/v1/locations/districts - Public endpoint to list districts by
     * province
     */
    @GetMapping("/districts")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<DistrictResponse>> getDistrictsByProvince(
            @RequestParam Long provinceId) {
        List<DistrictResponse> districts = locationService.getDistrictsByProvince(provinceId);
        return ApiResponse.<List<DistrictResponse>>builder()
                .code(200)
                .message("Districts retrieved successfully")
                .result(districts)
                .build();
    }

    /**
     * GET /api/v1/locations/wards - Public endpoint to list wards by district
     */
    @GetMapping("/wards")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<List<WardResponse>> getWardsByDistrict(
            @RequestParam Long districtId) {
        List<WardResponse> wards = locationService.getWardsByDistrict(districtId);
        return ApiResponse.<List<WardResponse>>builder()
                .code(200)
                .message("Wards retrieved successfully")
                .result(wards)
                .build();
    }
}
