package com.example.vnuguideapp.controller.Admin;

import com.example.vnuguideapp.dto.reponse.*;
import com.example.vnuguideapp.dto.request.*;
import com.example.vnuguideapp.service.Admin.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

  private final AdminService adminService;

  // ==================== DASHBOARD ====================

  @GetMapping("/dashboard/stats")
  public ResponseEntity<DashboardStatsResponse> getDashboardStats() {
    return ResponseEntity.ok(adminService.getDashboardStats());
  }

  // ==================== USERS ====================

  @GetMapping("/users")
  public ResponseEntity<PageResponse<AdminUserResponse>> getUsers(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String role,
      @RequestParam(required = false) String status) {
    return ResponseEntity.ok(adminService.getUsers(page, size, search, role, status));
  }

  @GetMapping("/users/{id}")
  public ResponseEntity<AdminUserResponse> getUserById(@PathVariable Long id) {
    return ResponseEntity.ok(adminService.getUserById(id));
  }

  @PatchMapping("/users/{id}/status")
  public ResponseEntity<Map<String, Boolean>> updateUserStatus(
      @PathVariable Long id,
      @RequestBody UpdateUserStatusRequest request) {
    adminService.updateUserStatus(id, request);
    return ResponseEntity.ok(Map.of("success", true));
  }

  @PostMapping("/users/{id}/warning")
  public ResponseEntity<Map<String, Boolean>> sendWarning(
      @PathVariable Long id,
      @RequestBody SendWarningRequest request) {
    adminService.sendWarning(id, request);
    return ResponseEntity.ok(Map.of("success", true));
  }

  // ==================== CATEGORIES ====================

  @GetMapping("/categories")
  public ResponseEntity<List<CategoryResponse>> getCategories(
      @RequestParam(required = false) String search) {
    return ResponseEntity.ok(adminService.getCategories(search));
  }

  @PostMapping("/categories")
  public ResponseEntity<CategoryResponse> createCategory(@RequestBody CategoryRequest request) {
    return ResponseEntity.ok(adminService.createCategory(request));
  }

  @PutMapping("/categories/{id}")
  public ResponseEntity<CategoryResponse> updateCategory(
      @PathVariable Long id,
      @RequestBody CategoryRequest request) {
    return ResponseEntity.ok(adminService.updateCategory(id, request));
  }

  @DeleteMapping("/categories/{id}")
  public ResponseEntity<Map<String, Boolean>> deleteCategory(@PathVariable Long id) {
    adminService.deleteCategory(id);
    return ResponseEntity.ok(Map.of("success", true));
  }

  // ==================== REPORTS ====================

  @GetMapping("/reports")
  public ResponseEntity<PageResponse<AdminReportResponse>> getReports(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String targetType) {
    return ResponseEntity.ok(adminService.getReports(page, size, search, status, targetType));
  }

  @PostMapping("/reports/{id}/process")
  public ResponseEntity<Map<String, Boolean>> processReport(
      @PathVariable Long id,
      @RequestBody ProcessReportRequest request) {
    System.out.println("========================================");
    System.out.println("[CONTROLLER] Process Report Request:");
    System.out.println("[CONTROLLER] Report ID: " + id);
    System.out.println("[CONTROLLER] Action: " + request.getAction());
    System.out.println("[CONTROLLER] Note: " + request.getNote());
    System.out.println("========================================");
    try {
      adminService.processReport(id, request);
      System.out.println("[CONTROLLER] ✓ Success processing report: " + id);
      return ResponseEntity.ok(Map.of("success", true));
    } catch (RuntimeException e) {
      System.err.println("[CONTROLLER] ✗ Error processing report: " + e.getMessage());
      e.printStackTrace();
      return ResponseEntity.status(500).body(Map.of("success", false));
    }
  }

  // ==================== REPORT TYPES ====================

  @GetMapping("/report-types")
  public ResponseEntity<List<com.example.vnuguideapp.dto.reponse.ReportTypeResponse>> getReportTypes(
      @RequestParam(required = false) String search) {
    return ResponseEntity.ok(adminService.getReportTypes(search));
  }

  @PostMapping("/report-types")
  public ResponseEntity<com.example.vnuguideapp.dto.reponse.ReportTypeResponse> createReportType(
      @RequestBody @Valid com.example.vnuguideapp.dto.request.ReportTypeRequest request) {
    return ResponseEntity.ok(adminService.createReportType(request));
  }

  @PutMapping("/report-types/{id}")
  public ResponseEntity<com.example.vnuguideapp.dto.reponse.ReportTypeResponse> updateReportType(
      @PathVariable Long id,
      @RequestBody @Valid com.example.vnuguideapp.dto.request.ReportTypeRequest request) {
    return ResponseEntity.ok(adminService.updateReportType(id, request));
  }

  @DeleteMapping("/report-types/{id}")
  public ResponseEntity<Map<String, Boolean>> deleteReportType(@PathVariable Long id) {
    adminService.deleteReportType(id);
    return ResponseEntity.ok(Map.of("success", true));
  }

  // ==================== POSTS ====================

  @GetMapping("/posts")
  public ResponseEntity<PageResponse<AdminPostResponse>> getPosts(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String status) {
    return ResponseEntity.ok(adminService.getPosts(page, size, search, status));
  }

  @PatchMapping("/posts/{id}/hide")
  public ResponseEntity<Map<String, Boolean>> hidePost(@PathVariable Long id) {
    adminService.hidePost(id);
    return ResponseEntity.ok(Map.of("success", true));
  }

  @DeleteMapping("/posts/{id}")
  public ResponseEntity<Map<String, Boolean>> deletePost(@PathVariable Long id) {
    adminService.deletePost(id);
    return ResponseEntity.ok(Map.of("success", true));
  }
}
