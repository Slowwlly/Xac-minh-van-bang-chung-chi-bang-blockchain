# TEMPLATE TÀI LIỆU BÁO CÁO — Đề tài #17: Xác minh văn bằng/chứng chỉ đại học bằng Blockchain

File này là dàn ý để nhóm điền vào báo cáo. Các mục in **[ĐIỀN]** nhóm tự bổ sung.

---

## 1. Phân tích yêu cầu và Use Case

### 1.1 Bài toán
Văn bằng/chứng chỉ truyền thống dễ bị làm giả, khó xác minh nhanh. Dùng Blockchain lưu **hash** của chứng chỉ giúp:
- Không thể sửa đổi lịch sử (bất biến).
- Bên thứ ba (nhà tuyển dụng) tự xác minh công khai không cần qua trung gian.
- Thu hồi được chứng chỉ khi phát hiện vi phạm.

### 1.2 Actor (người dùng)
| Actor | Vai trò | Hành động |
|---|---|---|
| **Admin / Nhà trường** | Cấp chứng chỉ, thu hồi | Phát hành, Thu hồi (cần mật khẩu + private key) |
| **Công chúng / Nhà tuyển dụng** | Xác minh tính hợp lệ | Nhập mã hoặc quét QR → xem kết quả |
| **Sinh viên / Người được cấp** | Nhận chứng chỉ + QR | Nhận file JSON + QR, chia sẻ link |

### 1.3 Use Case (liệt kê)
- UC1: Phát hành chứng chỉ (Admin) — [ĐIỀN: luồng chi tiết]
- UC2: Thu hồi chứng chỉ (Admin) — [ĐIỀN]
- UC3: Xác minh chứng chỉ (Công chúng) — [ĐIỀN]
- UC4: Tạo QR code chia sẻ (Admin/Sinh viên) — [ĐIỀN]

### 1.4 Dữ liệu on-chain / off-chain
| Nơi lưu | Dữ liệu |
|---|---|
| **On-chain** (Smart Contract) | `certificateHash` (SHA-256), `ipfsCID`, `issuer`, `issuedAt`, `revoked`, `exists` |
| **Off-chain** | File JSON: `certificateId`, `degree`, `major`, `institution`, `issuedDate` → lưu trên server + IPFS |
| **KHÔNG lưu on-chain** | Tên sinh viên, thông tin cá nhân (đảm bảo riêng tư) |

### 1.5 Phạm vi hệ thống
- [ĐIỀN: chạy trên Hardhat local, chưa lên testnet; chỉ hỗ trợ 1 nhà trường đơn trung tâm admin]

---

## 2. Sơ đồ kiến trúc hệ thống (vẽ vào báo cáo)

```
[Trình duyệt Web (4 tab)]
        |  HTTP/REST
        v
[Express server.js (port 3000)]
   |              |              |
   v              v              v
[Hardhat node]  [IPFS/Pinata]  [File JSON off-chain (data/)]
   |
   v
[Smart Contract CertificateRegistry]
```

**Luồng phát hành**: Form web → server tính SHA-256 → upload IPFS (lấy CID) → server ký bằng admin key → `issueCertificate()` on-chain → lưu file JSON + CID map.

**Luồng xác minh**: Nhập mã → server đọc on-chain `getCertificate()` → đọc file JSON off-chain → tính lại hash → so sánh + kiểm tra trạng thái thu hồi → trả kết quả.

**Luồng QR**: Tạo QR chứa URL `http://<IP-LAN>:3000/verify/<id>` → quét bằng điện thoại → mở trang xác minh tự động.

### 2.1 Mô hình dữ liệu
- Struct `Certificate` (on-chain): 6 trường như mục 1.4.
- Mapping `mapping(string => Certificate)`.
- Event: `CertificateIssued`, `CertificateRevoked`.

---

## 3. Kết quả kiểm thử (đã có sẵn, copy vào báo cáo)

Chạy `npx hardhat test` → **18/18 test pass**, gồm:
- Phát hành: thành công, emit event, chống trùng mã, từ chối ID/hash rỗng, CID để trống được.
- Xác minh: hash đúng → true; hash sai → false; không tồn tại → false; đã thu hồi → false.
- Thu hồi: thành công + event; không thu hồi được mã không tồn tại; không thu hồi 2 lần.
- **Bảo mật (access control)**: tài khoản không phải admin KHÔNG thể phát hành/thu hồi (revert "Only admin"); mọi người đều đọc được (tra cứu công khai).
- **Gas**: phát hành ~142,000 gas (có CID) / ~122,000 gas (không CID); thu hồi ~33,000 gas.

---

## 4. Phần tự phát triển (bắt buộc phải nêu rõ)

| Phần | Tự phát triển / Tham khảo |
|---|---|
| Smart Contract `CertificateRegistry` | Tự viết (tham khảo cấu trúc từ OpenZeppelin/Hardhat docs) |
| Giao diện web 4 tab + API server (issue/revoke/qr/status) | **Tự phát triển** |
| Tự tính SHA-256, tự upload IPFS, mật khẩu admin, QR động IP LAN | **Tự phát triển** |
| Bộ 18 Unit Test (chức năng + bảo mật + gas) | **Tự phát triển** |
| Thư viện: ethers.js, express, qrcode, hardhat, hardhat-toolbox | Thư viện tham khảo |

---

## 5. Hạn chế và hướng phát triển
- [ĐIỀN: server-side signing → chuyển sang MetaMask; Hardhat local → testnet Sepolia; file JSON → database/IPFS hoàn toàn; thêm role cho nhiều nhà trường]
