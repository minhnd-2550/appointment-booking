# Tài liệu sản phẩm

## 1) Thông tin chung

- **Tên sản phẩm**: Hệ thống đặt lịch khám (Appointment Booking)
- **Repository**: `minhnd-2550/appointment-booking`
- **Nhánh hiện tại**: `main`
- **Nền tảng**: Web app (Next.js + Supabase)
- **Mục tiêu nghiệp vụ**:
  - Đặt lịch khám theo khung giờ.
  - Quản lý lịch hẹn theo vai trò (Bệnh nhân/Bác sĩ/Lễ tân/Admin).
  - Hỗ trợ hồ sơ lâm sàng, chỉ định cận lâm sàng, thanh toán/hóa đơn, thông báo, hàng chờ.

---

## 2) Phạm vi sản phẩm

### 2.1 Thành phần hệ thống

- **Frontend + Backend API** trong cùng dự án Next.js App Router (`src/app` + `src/app/api`).
- **Cơ sở dữ liệu** PostgreSQL qua Supabase (migrations tại `supabase/migrations`).
- **Xác thực & phân quyền** qua Supabase Auth + bảng `user_profiles`.
- **Realtime** qua Supabase Realtime cho cập nhật lịch/slot.
- **Email/Notification** qua Resend hoặc mock mode.
- **Cron job** nhắc lịch qua endpoint `GET /api/cron/reminders` (Vercel Cron mỗi 5 phút).

### 2.2 Tài nguyên dự án chính

- Mã nguồn đầy đủ trong repo.
- Migrations schema + seed dữ liệu.
- Cấu hình môi trường mẫu (`.env.example`).
- Tài liệu đặc tả nghiệp vụ chi tiết trong `specs/001-appointment-booking/*`.

---

## 3) Kiến trúc kỹ thuật

### 3.1 Stack công nghệ

- **Framework**: Next.js `16.1.6` (App Router)
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, Radix UI
- **State/Data Fetching**: TanStack Query
- **Validation**: Zod
- **Date/Time**: date-fns, date-fns-tz
- **Auth/DB/Storage/Realtime**: Supabase
- **Email**: Resend (hoặc `MOCK_EMAIL=true`)
- **PDF**: PDF generation nội bộ (toa thuốc / hóa đơn)

### 3.2 Cấu trúc thư mục quan trọng

- `src/app/(public)`: trang công khai (trang chủ, hồ sơ bác sĩ, đặt lịch)
- `src/app/(patient)`: cổng bệnh nhân
- `src/app/(provider)`: cổng bác sĩ
- `src/app/(receptionist)`: cổng lễ tân
- `src/app/(admin)`: cổng quản trị
- `src/app/api`: toàn bộ API route theo domain
- `src/components/*`: thành phần UI theo module nghiệp vụ
- `src/lib/*`: scheduling, notifications, invoicing, utils
- `supabase/migrations`: version hóa schema DB
- `supabase/seed.sql`, `supabase/seed-auth-users.sh`: dữ liệu mẫu local
- `vercel.json`: cấu hình cron production

### 3.3 Luồng tổng quát

1. Người dùng thao tác UI (public/patient/provider/receptionist/admin).
2. UI gọi API route tại `src/app/api/**`.
3. API thao tác Supabase DB/Auth/Storage theo role và chính sách.
4. Sự kiện trạng thái lịch hẹn kích hoạt email/thông báo.
5. Realtime cập nhật slot/lịch mà không cần reload toàn trang.

---

## 4) Phân quyền và bảo mật

### 4.1 Vai trò

- `patient`
- `provider`
- `receptionist`
- `admin`

### 4.2 Bảo vệ route

Middleware tại `src/middleware.ts` thực hiện:

- Chặn truy cập trái phép vào nhóm route bảo vệ:
  - `/dashboard*` (provider)
  - `/admin*` (admin)
  - `/receptionist*` (receptionist)
  - `/my-appointments*`, `/my-profile*`, `/my-invoices*`, `/my-dependents*` (patient)
- Redirect login khi chưa xác thực.
- Kiểm tra role trước khi vào khu vực chức năng.
- Kiểm tra trạng thái tài khoản (`is_active`) và logout nếu bị vô hiệu.
- Gắn security headers cơ bản (`X-Content-Type-Options`, `X-Frame-Options`).

### 4.3 Bảo mật dữ liệu

- RLS được bật trên các bảng chính (migrations).
- API route kiểm tra quyền theo user profile và doctor ownership.
- Tài liệu/tệp sử dụng signed URL theo phạm vi truy cập.
- Tách biệt key public và service role theo biến môi trường.

---

## 5) Chức năng theo vai trò

### 5.1 Khách/Bệnh nhân

- Xem danh sách bác sĩ và ngày trống gần nhất.
- Đặt lịch khám theo slot.
- Đăng ký/đăng nhập tài khoản bệnh nhân.
- Quản lý lịch hẹn cá nhân:
  - Hủy lịch
  - Dời lịch
  - Theo dõi kết quả cận lâm sàng
  - Thanh toán và xem hóa đơn
- Quản lý hồ sơ cá nhân và tiền sử bệnh.
- Quản lý người phụ thuộc (dependent).
- Tải tài liệu bệnh án đính kèm trước khám.
- Quản lý hàng chờ (waitlist).
- Trung tâm thông báo + tùy chọn nhận email.

### 5.2 Bác sĩ (Provider)

- Dashboard lịch hẹn.
- Lịch hôm nay (today schedule).
- Danh sách bệnh nhân đã khám/đặt khám.
- Chi tiết bệnh sử bệnh nhân theo lịch hẹn.
- Ghi nhận lâm sàng:
  - Chẩn đoán
  - Ghi chú khám
  - Kê đơn (prescription items)
- Chỉ định cận lâm sàng và cập nhật kết quả.
- Đánh dấu hoàn tất khám (`completed`).
- In/xuất toa thuốc PDF.
- Quản lý hồ sơ bác sĩ (bio/chuyên khoa/phí khám...).

### 5.3 Lễ tân (Receptionist)

- Day-view toàn phòng khám theo ngày.
- Tạo lịch walk-in/đặt hộ qua điện thoại.
- Cập nhật thông tin liên hệ của lịch hẹn.
- Check-in bệnh nhân tại quầy.

### 5.4 Quản trị (Admin)

- Quản trị lịch làm việc bác sĩ + blocked periods.
- Quản lý người dùng (provider/patient).
- Quản lý dịch vụ và giá.
- Quản lý lịch hẹn toàn hệ thống + hủy theo quyền admin.
- Báo cáo lịch hẹn/doanh thu (có xuất CSV).
- Cài đặt hệ thống (cutoff, nhắc lịch, giới hạn upload...).
- Nhật ký/audit log.

---

## 6) Danh sách màn hình chính

### Public

- `/` — Trang chủ + danh sách bác sĩ
- `/doctors/[id]` — Hồ sơ bác sĩ
- `/book/[doctorId]` — Đặt lịch theo bác sĩ
- `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`

### Patient

- `/my-appointments`
- `/my-appointments/[id]`
- `/my-profile`
- `/my-profile/notification-preferences`
- `/my-invoices`
- `/my-dependents`

### Provider

- `/dashboard`
- `/dashboard/today`
- `/dashboard/patients`
- `/dashboard/patients/[patientId]`
- `/dashboard/profile`

### Receptionist

- `/receptionist/day-view`
- `/receptionist/walk-in`

### Admin

- `/admin/schedules`
- `/admin/appointments`
- `/admin/users`
- `/admin/reports`
- `/admin/audit-log`
- `/admin/settings`

---

## 7) Danh mục API hiện có (theo nhóm)

> Nguồn tổng hợp từ `src/app/api/**/route.ts` trên nhánh hiện tại.

### 7.1 Public/Booking

- `/api/slots`
- `/api/appointments`
- `/api/appointments/[id]/status`
- `/api/doctors/[id]/profile`
- `/api/waitlist`
- `/api/waitlist/claim`

### 7.2 Doctor

- `/api/doctor/profile`
- `/api/doctor/schedule/today`
- `/api/doctor/patients`
- `/api/doctor/patients/[patientId]`
- `/api/doctor/appointments/[id]/status`
- `/api/doctor/appointments/[id]/complete`
- `/api/doctor/appointments/[id]/internal-note`
- `/api/doctor/appointments/[id]/clinical`
- `/api/doctor/appointments/[id]/lab-orders`
- `/api/doctor/lab-orders/[orderId]/result`
- `/api/doctor/appointments/[id]/patient-documents`
- `/api/doctor/appointments/[id]/prescription-pdf`

### 7.3 Patient

- `/api/patient/profile`
- `/api/patient/medical-background`
- `/api/patient/medical-background/[id]`
- `/api/patient/dependents`
- `/api/patient/dependents/[id]`
- `/api/patient/appointments/[id]/cancel`
- `/api/patient/appointments/[id]/reschedule`
- `/api/patient/appointments/[id]/payment`
- `/api/patient/appointments/[id]/results`
- `/api/patient/appointments/[id]/documents`
- `/api/patient/invoices`
- `/api/patient/waitlist`
- `/api/patient/waitlist/[id]`
- `/api/patient/notifications`
- `/api/patient/notification-preferences`
- `/api/patient/settings/cutoff`

### 7.4 Receptionist

- `/api/receptionist/day-view`
- `/api/receptionist/appointments`
- `/api/receptionist/appointments/[id]/contact`
- `/api/receptionist/appointments/[id]/check-in`

### 7.5 Admin

- `/api/admin/settings`
- `/api/admin/audit-log`
- `/api/admin/appointments`
- `/api/admin/appointments/[id]/cancel`
- `/api/admin/providers`
- `/api/admin/providers/[id]`
- `/api/admin/patients`
- `/api/admin/patients/[id]`
- `/api/admin/services`
- `/api/admin/services/[id]`
- `/api/admin/reports/appointments`
- `/api/admin/reports/revenue`

### 7.6 Scheduling configuration

- `/api/schedules`
- `/api/schedules/[id]`
- `/api/blocked-periods`
- `/api/blocked-periods/[id]`

### 7.7 System/Cron

- `/api/cron/reminders`

---

## 8) Cơ sở dữ liệu và migration

### 8.1 Danh mục bảng chính

- Core booking:
  - `doctors`, `user_profiles`, `working_schedules`, `blocked_periods`, `appointments`, `notification_logs`
- Clinical:
  - `patient_profiles`, `patient_medical_backgrounds`, `medical_records`, `prescription_items`
- Lab/Payment/Service:
  - `lab_orders`, `examination_results`, `services`, `payments`
- Provider/Receptionist:
  - `doctor_profiles`, `internal_notes`, `patient_check_ins`, `doctor_ratings`
- Patient experience:
  - `dependents`, `waitlist_entries`, `notification_preferences`, `in_app_notifications`
- Documents/System:
  - `patient_documents`, `system_settings`, `audit_log_entries`

### 8.2 Migration lịch sử (thứ tự chính)

- `20260305000000_initial_schema.sql` — schema nền tảng
- `20260305000001_book_appointment_function.sql` — hàm booking/status
- `20260306000000` → `20260306000007` — mở rộng role, lâm sàng, payment, receptionist, docs, system
- `20260307000000_fix_rls_infinite_recursion.sql` — fix RLS
- `20260308000000_drop_old_book_appointment_overload.sql` — tránh overload RPC gây ambiguity
- `20260309000000_add_updated_at_to_appointments.sql` — chuẩn hóa `updated_at`
- `20260309010000_normalize_legacy_seed_uuids.sql` — normalize UUID seed cũ

### 8.3 Ghi chú dữ liệu

- `appointments` đã hỗ trợ:
  - `user_id` (gắn bệnh nhân authenticated)
  - `dependent_id` (đặt cho người phụ thuộc)
  - guest booking (`user_id` null)
- Có trigger cập nhật `updated_at` cho `appointments`.

---

## 9) Cấu hình môi trường

### 9.1 Biến môi trường bắt buộc

Theo `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MOCK_EMAIL`
- `CRON_SECRET`

### 9.2 Nguyên tắc bảo mật

- Không commit secret thật vào Git.
- Không dùng prefix `NEXT_PUBLIC_` cho server secret.
- Tách secret theo môi trường: local/staging/prod.
- Xoay vòng key trước khi triển khai production.

---

## 10) Vận hành local / staging / production

### 10.1 Local development

- Chạy Supabase local (`supabase start`).
- Reset DB + seed (`supabase db reset`).
- Tạo tài khoản auth mẫu bằng script `supabase/seed-auth-users.sh`.
- Chạy app bằng `pnpm dev`.

### 10.2 Cron nhắc lịch

- Cấu hình tại `vercel.json`:
  - `path`: `/api/cron/reminders`
  - `schedule`: `*/5 * * * *`
- Endpoint yêu cầu bearer secret theo `CRON_SECRET`.

### 10.3 Email

- Local: dùng `MOCK_EMAIL=true` để log thay vì gửi thật.
- Production: cấu hình `RESEND_API_KEY` thật, kiểm tra SPF/DKIM/DMARC domain gửi.

### 10.4 File storage

- Dùng Supabase Storage cho tài liệu/phiếu kết quả.
- Truy cập file qua signed URL có hạn.

---

## 11) Tài khoản mẫu (môi trường local)

Theo `supabase/seed-auth-users.sh`:

- `admin@clinic.vn` / `Admin@123456`
- `dr.an@clinic.vn` / `Doctor@123456`
- `dr.bich@clinic.vn` / `Doctor@123456`
- `dr.duc@clinic.vn` / `Doctor@123456`
- `receptionist@clinic.vn` / `Receptionist@123456`
- `patient@clinic.vn` / `Patient@123456`

> Khuyến nghị: đổi toàn bộ mật khẩu mặc định ngay sau khi khởi tạo môi trường thực tế.

---

## 12) Chất lượng mã nguồn hiện tại

Trạng thái kiểm tra gần nhất trên nhánh hiện tại:

- TypeScript check: **pass** (`tsc --noEmit`)
- Lint: **pass** (0 errors, 0 warnings)

---

## 13) Các điểm kỹ thuật đáng chú ý

- Luồng doctor ownership đã được chuẩn hóa theo `user_profiles.doctor_id` + fallback email.
- Danh sách bệnh nhân bác sĩ hỗ trợ cả:
  - bệnh nhân có tài khoản (`authenticated`)
  - khách vãng lai (`guest`)
- Toa thuốc PDF lấy dữ liệu từ `medical_records` + `prescription_items`.
- Prescription endpoint trả `application/pdf` và tên file `.pdf`.
- Đặt lịch đã xử lý xung đột slot ở tầng DB (atomic booking).

---

## 14) Hạn chế hiện tại và khuyến nghị cải tiến

### 14.1 Hạn chế

- Một số tài liệu gốc (`README.md`) còn template mặc định, chưa phản ánh đầy đủ sản phẩm.
- Bộ test tự động chưa được chuẩn hóa thành script đầy đủ trong `package.json` (ưu tiên lint/typecheck).
- PDF toa thuốc hiện là light renderer tự xây dựng, cần cân nhắc nâng cấp engine nếu yêu cầu format pháp lý cao.

### 14.2 Khuyến nghị

1. Chuẩn hóa CI/CD pipeline:
   - lint + typecheck + test + migration check.
2. Bổ sung monitoring production:
   - API error rate, cron success rate, email delivery rate.
3. Hardening bảo mật:
   - bật CSP, rate-limit login/API nhạy cảm.
4. Viết SOP vận hành:
   - backup/restore DB, rollback migration, incident playbook.

---

## 15) Checklist vận hành & kiểm thử

### 15.1 Kiểm thử chức năng

- [ ] Public booking: xem slot và đặt lịch thành công.
- [ ] Provider: xác nhận/hủy/hoàn tất lịch, ghi lâm sàng, in toa.
- [ ] Receptionist: walk-in, check-in, day-view.
- [ ] Patient: xem lịch sử, hồ sơ, invoices, dependents, notifications.
- [ ] Admin: schedules, users, reports, settings, audit-log.

### 15.2 Kiểm thử kỹ thuật

- [ ] Migrations chạy sạch trên môi trường mới.
- [ ] Role/RLS kiểm thử đúng phạm vi truy cập.
- [ ] Cron nhắc lịch chạy đúng tần suất.
- [ ] Email gửi thành công (hoặc mock theo môi trường).
- [ ] Upload/download tài liệu bằng signed URL hoạt động.

### 15.3 Kiểm thử bảo mật

- [ ] Tài khoản mặc định đã đổi mật khẩu.
- [ ] Secrets đã tách riêng theo môi trường.
- [ ] Kiểm tra không lộ service-role key ở client.

---

## 16) Tài liệu tham chiếu kỹ thuật

### 16.1 Tài liệu trong repo

- Nghiệp vụ + acceptance + FR: `specs/001-appointment-booking/spec.md`
- Data model: `specs/001-appointment-booking/data-model.md`
- API contracts: `specs/001-appointment-booking/contracts/*.md`
- Quickstart kỹ thuật: `specs/001-appointment-booking/quickstart.md`

### 16.2 Cấu hình trọng yếu

- Middleware auth/role: `src/middleware.ts`
- Cron config: `vercel.json`
- Env mẫu: `.env.example`
- Supabase local config: `supabase/config.toml`

---

## 17) Kết luận

Sản phẩm đã có đầy đủ khối chức năng cốt lõi cho vận hành phòng khám đa vai trò, với kiến trúc tách lớp rõ ràng, migration versioned, API theo domain và cơ chế bảo vệ truy cập theo role/RLS.  
Tài liệu này đóng vai trò **nguồn tham chiếu chính thức về sản phẩm** ở cả góc độ nghiệp vụ, vận hành và kỹ thuật.
