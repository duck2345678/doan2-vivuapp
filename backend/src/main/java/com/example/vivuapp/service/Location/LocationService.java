package com.example.vivuapp.service.Location;

import com.example.vivuapp.dto.reponse.PlaceAndMapping.DistrictResponse;
import com.example.vivuapp.dto.reponse.PlaceAndMapping.ProvinceResponse;
import com.example.vivuapp.dto.reponse.PlaceAndMapping.WardResponse;
import com.example.vivuapp.repository.Location.DistrictRepository;
import com.example.vivuapp.repository.Location.ProvinceRepository;
import com.example.vivuapp.repository.Location.WardRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LocationService {

    ProvinceRepository provinceRepository;
    DistrictRepository districtRepository;
    WardRepository wardRepository;

    public List<ProvinceResponse> getAllProvinces() {
        return provinceRepository.findAll().stream()
                .map(p -> ProvinceResponse.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .build())
                .collect(Collectors.toList());
    }

    public List<DistrictResponse> getDistrictsByProvince(Long provinceId) {
        return districtRepository.findByProvinceId(provinceId).stream()
                .map(d -> DistrictResponse.builder()
                        .id(d.getId())
                        .name(d.getName())
                        .provinceId(provinceId)
                        .build())
                .collect(Collectors.toList());
    }

    public List<WardResponse> getWardsByDistrict(Long districtId) {
        return wardRepository.findByDistrictId(districtId).stream()
                .map(w -> WardResponse.builder()
                        .id(w.getId())
                        .name(w.getName())
                        .districtId(districtId)
                        .build())
                .collect(Collectors.toList());
    }
}
