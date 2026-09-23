-- Add default 'OTHER' place type for Google Places that don't match existing types
INSERT INTO place_types (code, name, description, icon_type)
VALUES ('OTHER', 'Khác', 'Địa điểm khác không thuộc danh mục cụ thể', 'other')
ON CONFLICT (code) DO NOTHING;
