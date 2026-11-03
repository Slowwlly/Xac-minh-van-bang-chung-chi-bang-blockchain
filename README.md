# Hệ thống Xác minh Chứng chỉ Blockchain (Đề tài #17)

Demo ứng dụng quản lý và xác minh văn bằng/chứng chỉ đại học bằng Blockchain (Ethereum + Hardhat + IPFS). Hệ thống chỉ ghi **bằng chứng tối thiểu** lên chuỗi; nội dung chi tiết được lưu ngoài chuỗi, không đưa thông tin cá nhân lên blockchain.

- **Học phần:** Công nghệ Blockchain, Khoa Công nghệ thông tin, Trường Đại học Hải Phòng
- **Nhóm thực hiện:** Phạm Văn Dương, Nguyễn Trung Đức, Nguyễn Văn Mạnh (lớp CNTT.1 - K25)
- **Giảng viên hướng dẫn:** PGS.TS Lê Đắc Nhường

> 
> ⚠️ **Lưu ý:** đây là sản phẩm học tập chạy trên mạng cục bộ, dùng dữ liệu giả lập. Không phải dịch vụ chính thức và chưa được kiểm toán bảo mật.

---

## 1. Chức năng chính

Bảng

| Chức năng | Mô tả | Quyền |
| --- | --- | --- |
| **Phát hành chứng chỉ** | Nhập thông tin → tự tính SHA-256, upload IPFS (Pinata), ghi bản ghi lên blockchain | Admin (cần mật khẩu) |
| **Thu hồi chứng chỉ** | Đánh dấu trạng thái thu hồi trên chuỗi (không thể hoàn tác) | Admin (cần mật khẩu) |
| **Tạo mã QR** | Tạo QR trỏ đến trang xác minh, có thể tải về dưới dạng PNG | Công khai |
| **Xác minh / Tra cứu** | Kiểm tra hash + trạng thái on-chain, đối chiếu dữ liệu, công khai không cần đăng nhập | Công khai |

**Nguyên tắc dữ liệu:**

- ✅ **On-chain**: mã chứng chỉ, hash SHA-256, CID IPFS, địa chỉ người phát hành, thời gian, trạng thái thu hồi
- ✅ **Off-chain**: nội dung chi tiết chứng chỉ (`data/certificates/*.json` + IPFS)
- ✅ **Không lưu** thông tin cá nhân (họ tên, mã SV...) lên chuỗi

---

## 2. Kiến trúc tổng quan

```
 Người vận hành (Admin)                     Bên xác minh (Công chúng)
   | Phát hành / Thu hồi (giao dịch)              | Quét QR / Truy cập web
   v                                              v
+-------------------+                    +-------------------+
|  Hardhat Node     |<-------------------|   server.js       |
|  Smart Contract   |  Đọc/Ghi giao dịch  |   (Express:3000) |
+-------------------+                    +---------+---------+
        ^                                            |
        | Dữ liệu băm + CID                          | Đọc file JSON + tính lại hash
   +----+----+                                       v
   | Pinata  |                                Trả về trạng thái:
   | (IPFS)  |                                VALID / REVOKED / HASH_MISMATCH
   +---------+
```

### Smart Contract `CertificateRegistry`

Bảng

| Hàm / Sự kiện | Quyền | Mô tả |
| --- | --- | --- |
| `constructor()` | — | Người triển khai trở thành admin |
| `issueCertificate(id, hash, cid)` | `onlyAdmin` | Ghi bản ghi mới; từ chối trống/đã tồn tại/hash rỗng |
| `revokeCertificate(id)` | `onlyAdmin` | Đánh dấu thu hồi; không xóa dữ liệu |
| `verifyCertificate(id, hash)` | Công khai | Kiểm tra hợp lệ: tồn tại + chưa thu hồi + khớp hash |
| `getCertificate(id)` | Công khai | Trả về đầy đủ thông tin bản ghi |
| `CertificateIssued`, `CertificateRevoked` | — | Sự kiện phục vụ theo dõi |

---

## 3. Công nghệ sử dụng

Bảng

| Thành phần | Mô tả |
| --- | --- |
| **Solidity ^0.8.28** | Ngôn ngữ viết hợp đồng thông minh |
| **Hardhat** | Môi trường phát triển, biên dịch, triển khai, kiểm thử |
| **Ethers.js** | Kết nối và ký giao dịch với blockchain |
| **Node.js + Express** | Máy chủ web & API trung gian |
| **Pinata (IPFS)** | Lưu trữ dữ liệu off-chain phân tán (tùy chọn) |
| **qrcode** | Sinh mã QR |
| **dotenv** | Quản lý biến môi trường & khóa bảo mật |

---

## 4. Cấu trúc thư mục

```
blockchain-certificate/
├── contracts/          # Smart Contract
│   └── CertificateRegistry.sol
├── scripts/             # Triển khai, phát hành, thu hồi, tạo hash, upload IPFS, tạo QR
├── test/                # Bộ Unit Test (18 trường hợp: chức năng + bảo mật + đo gas)
├── public/              # Giao diện web (4 tab: Xác minh / Phát hành / Thu hồi / Tạo QR)
│   └── index.html
├── data/                # Dữ liệu chứng chỉ off-chain
│   ├── certificates/    # Từng chứng chỉ định dạng JSON
│   ├── certificate.json  # Mẫu dữ liệu
│   └── ipfs-cids.json    # Ánh xạ ID → CID IPFS
├── server.js            # Backend API + máy chủ web
├── hardhat.config.js    # Cấu hình mạng & biên dịch
├── package.json
├── .env.example         # Mẫu cấu hình môi trường
└── .gitignore           # Loại trừ: node_modules, .env, file sinh ra khi chạy
```

> 
> Các file tự động tạo (đã bị loại trừ): `deployed-address.json`, `ipfs-cid.json`, `artifacts/`, `cache/`, `.env`

---

## 5. Cài đặt & Cấu hình

### Yêu cầu hệ thống
- Node.js từ 18 trở lên (script upload IPFS dùng `fetch` có sẵn của Node)
- npm
- Tài khoản [Pinata](https://pinata.cloud) và một JWT API key (chỉ cần cho bước upload IPFS)

### Bước cài đặt

```
# 1. Clone dự án
git clone https://github.com/Slowwlly/Xac-minh-van-bang-chung-chi-bang-blockchain.git
cd Xac-minh-van-bang-chung-chi-bang-blockchain

# 2. Cài thư viện
npm install

# 3. Cấu hình biến môi trường
cp .env.example .env
# → Mở .env và điền thông tin theo hướng dẫn bên dưới

# 4. Biên dịch hợp đồng
npx hardhat compile
```

### Cấu hình `.env`

Bảng

| Biến | Mô tả | Giá trị mặc định |
| --- | --- | --- |
| `PINATA_JWT` | Khóa xác thực Pinata | — (bỏ trống nếu không dùng IPFS) |
| `ADMIN_PASSWORD` | Mật khẩu bảo vệ chức năng phát hành/thu hồi | `admin123` **(nên đổi ngay)** |
| `ADMIN_PRIVATE_KEY` | Khóa riêng ký giao dịch | Tài khoản số #0 của Hardhat |
| `RPC_URL` | Địa chỉ node blockchain | `http://127.0.0.1:8545` |
| `QR_BASE_URL` | Tiền tố URL trong QR | Tự động phát hiện IP LAN |

> 
> 🔒 **Quan trọng:** Không bao giờ commit file `.env` lên GitHub — đã được bảo vệ trong `.gitignore`.

---

## 6. Chạy Demo

Cần **2 cửa sổ Terminal** tại thư mục gốc dự án:

**Terminal 1 — Khởi động mạng Blockchain cục bộ**

```
npx hardhat node
# → Giữ nguyên cửa sổ này, không đóng
```

**Terminal 2 — Triển khai & Khởi động Web**

```
# 1. Triển khai hợp đồng
npx hardhat run scripts/deploy.js --network localhost

# 2. Khởi động máy chủ web
node server.js
```

Mở trình duyệt truy cập:

- 🏠 Trang chủ: `http://localhost:3000`
- 📱 Trên điện thoại cùng WiFi: dùng **IP LAN** hiển thị ở dòng "Website trên mạng LAN"

### Các thao tác chính

Bảng

| Hành động | Cách thực hiện |
| --- | --- |
| **Phát hành** | Tab Phát hành → điền thông tin + mật khẩu → Xác nhận |
| **Tạo QR** | Tab Tạo QR → nhập mã → (tự chọn IP LAN nếu cần) → Tạo & Tải về |
| **Xác minh** | Quét QR hoặc nhập mã → Hệ thống kiểm tra và hiển thị trạng thái |
| **Thu hồi** | Tab Thu hồi → nhập mã + mật khẩu → Xác nhận (không hoàn tác được!) |

### Chạy kiểm thử

```
npx hardhat test
# → 18/18 test bao gồm: chức năng, bảo mật chỉ admin được phép, đo gas tiêu thụ
```

---

## 7. Sửa lỗi thường gặp

Bảng

| Hiện tượng | Nguyên nhân / Cách khắc phục |
| --- | --- |
| ❌ Điện thoại quét QR không mở được | QR chứa `localhost` → hệ thống tự phát hiện IP LAN, hoặc điền thủ công IP vào ô "URL cơ sở"; cùng WiFi; mở cổng 3000 trên tường lửa |
| ❌ `SYSTEM_NOT_READY` | Chưa chạy `npx hardhat compile` + `deploy.js`; hoặc đã khởi động lại node → triển khai lại |
| ❌ `Only admin` | Tài khoản ký giao dịch không phải người triển khai; kiểm tra `ADMIN_PRIVATE_KEY` trong `.env` |
| ❌ `Already exists` | Mã chứng chỉ đã được phát hành → dùng mã khác |
| ❌ Mất dữ liệu sau khi tắt node | Mạng Hardhat cục bộ không lưu trữ vĩnh viễn → khởi động lại node thì phải `deploy` + phát hành lại |
| ❌ Không upload IPFS được | Kiểm tra `PINATA_JWT` còn hợp lệ; xem hướng dẫn tại [Pinata Docs](https://docs.pinata.cloud) |

---

## 8. Phát triển & Đóng góp

### So sánh với phiên bản tham khảo ban đầu

Bảng

| Phần | Nội dung tự phát triển |
| --- | --- |
| Giao diện | Thay vì chỉ trang xác minh → xây dựng **4 tab hoàn chỉnh** (Phát hành / Thu hồi / Tạo QR / Xác minh) |
| API Server | Xây dựng các endpoint mới: `/api/issue`, `/api/revoke`, `/api/qr/:id`, `/api/status`... |
| Tích hợp tự động | Tính hash, upload IPFS, tạo file JSON đều tự động trên giao diện — không cần gõ lệnh |
| Bảo mật | Thêm lớp xác thực bằng mật khẩu cho chức năng ghi dữ liệu; tách quyền admin/công chúng |
| QR cải tiến | Tự phát hiện IP LAN, hiển thị danh sách IP có sẵn → chọn một cú nhấp là dùng được |
| Kiểm thử | Xây dựng bộ **18 Unit Test** bao gồm kiểm soát quyền truy cập, chức năng, đo gas |
| Tài liệu | Hoàn thiện README, hướng dẫn cài đặt, xử lý lỗi, báo cáo đề tài |

### Hướng phát triển trong tương lai

- 🔐 Ký giao dịch phía trình duyệt qua **MetaMask** → không còn lưu khóa riêng trên server
- 🌐 Triển khai lên **testnet Sepolia** thay vì chỉ chạy cục bộ
- 💾 Lưu dữ liệu off-chain hoàn toàn trên IPFS, không phụ thuộc file JSON trên server
- 📊 Thêm thống kê, tìm kiếm nâng cao, phân trang
- ✅ Thêm salt ngẫu nhiên khi băm để tăng bảo mật

---

## 9. Giấy phép

Dự án phục vụ mục đích học tập.
