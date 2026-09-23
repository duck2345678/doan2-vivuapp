# 🔑 Hướng dẫn tạo Gemini API Key mới

## ⚠️ Vấn đề
API key cũ đã bị leak và Google đã vô hiệu hóa nó. Bạn cần tạo API key mới để sử dụng tính năng AI.

## 📝 Các bước tạo API key mới

### Bước 1: Truy cập Google AI Studio
1. Mở trình duyệt và truy cập: **https://aistudio.google.com/app/apikey**
2. Đăng nhập bằng tài khoản Google của bạn

### Bước 2: Tạo API Key
1. Click nút **"Create API Key"** (Tạo khóa API)
2. Chọn một trong hai:
   - **Select existing project**: Chọn project Google Cloud có sẵn
   - **Create API key in new project**: Tạo project mới (khuyến nghị cho người mới)
3. Click **"Create"**
4. Copy API key mới (nó sẽ có dạng: `AIzaSy...`)

### Bước 3: Cập nhật vào .env
1. Mở file `.env` trong project
2. Tìm dòng `EXPO_PUBLIC_GEMINI_API_KEY=`
3. Paste API key mới vào:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy_YOUR_NEW_KEY_HERE
   ```
4. Save file

### Bước 4: Restart app
```bash
# Dừng app hiện tại (Ctrl+C)
# Xóa cache và start lại
npm start -- --reset-cache
```

## 🔒 Bảo mật API Key

### ✅ Những điều NÊN làm:
- ✅ Luôn giữ API key trong file `.env`
- ✅ Đảm bảo `.env` có trong `.gitignore`
- ✅ KHÔNG commit file `.env` lên Git
- ✅ KHÔNG share API key công khai
- ✅ Sử dụng environment variables khi deploy

### ❌ Những điều KHÔNG NÊN làm:
- ❌ Hardcode API key trực tiếp vào code
- ❌ Commit file `.env` lên GitHub
- ❌ Share code có chứa API key
- ❌ Để API key trong screenshot/video

## 🧪 Kiểm tra API key hoạt động

Sau khi cập nhật API key mới, test bằng cách:

1. Mở app trên điện thoại/emulator
2. Vào **"Gợi ý nhanh"** (AI Wizard)
3. Chọn các tùy chọn:
   - Mục đích: Chạy Deadline
   - Phương tiện: Đi bộ / Xe buýt
   - Ngân sách: Đầu tháng / Có lương
4. Bấm **"Gợi ý cho tôi ngay!"**
5. Chờ 3 giây loading

### ✅ Nếu thành công:
- Console log: `🤖 Calling Gemini AI...`
- Console log: `✅ Gemini AI response received`
- Hiển thị lịch trình AI với map và timeline

### ❌ Nếu thất bại:
- Console log: `❌ Gemini API Error: ...`
- Console log: `⚠️ Using mock data as fallback`
- App vẫn hoạt động với dữ liệu mẫu

## 📊 Quota và giới hạn

### Free tier (Miễn phí):
- **60 requests/phút**
- **1,500 requests/ngày**
- Đủ cho development và testing

### Nếu hết quota:
- App sẽ tự động fallback về mock data
- Chờ 1 ngày để quota reset
- Hoặc nâng cấp lên paid tier

## 🔗 Links hữu ích

- **Google AI Studio**: https://aistudio.google.com/app/apikey
- **Gemini API Docs**: https://ai.google.dev/docs
- **API Key Management**: https://console.cloud.google.com/apis/credentials
- **Quota Dashboard**: https://console.cloud.google.com/apis/dashboard

## ❓ Troubleshooting

### Lỗi 403: "API key leaked"
- API key đã bị leak và bị vô hiệu hóa
- Giải pháp: Tạo API key mới theo hướng dẫn trên

### Lỗi 403: "API key not valid"
- API key không đúng hoặc bị revoke
- Giải pháp: Kiểm tra lại key trong .env, tạo mới nếu cần

### Lỗi 403: "API not enabled"
- Chưa enable Gemini API trong Google Cloud Console
- Giải pháp: Vào https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com → Enable

### Lỗi 429: "Quota exceeded"
- Đã vượt quá giới hạn requests
- Giải pháp: Chờ quota reset hoặc nâng cấp plan

### App không nhận key mới:
```bash
# Clear cache và restart
npm start -- --reset-cache
# Hoặc
expo start -c
```

## 💡 Tips

1. **Backup API key**: Lưu API key ở nơi an toàn (password manager)
2. **Multiple keys**: Tạo nhiều keys cho dev/prod
3. **Monitoring**: Theo dõi usage tại Google Cloud Console
4. **Restrictions**: Cân nhắc thêm IP/domain restrictions cho production

---

**Cần hỗ trợ?** Check console logs và Google AI Studio dashboard để debug.
