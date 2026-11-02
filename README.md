# Xác minh văn bằng/chứng chỉ đại học bằng Blockchain

Nguyên mẫu (prototype) xác minh văn bằng/chứng chỉ bằng Smart Contract trên mạng Blockchain cục bộ (Hardhat).
Hệ thống chỉ ghi **bằng chứng tối thiểu** (mã chứng chỉ, mã băm SHA-256, CID IPFS, địa chỉ phát hành, thời điểm, trạng thái thu hồi) lên chuỗi; nội dung chứng chỉ được lưu ngoài chuỗi.

- **Học phần:** Công nghệ Blockchain, Khoa Công nghệ thông tin, Trường Đại học Hải Phòng
- **Nhóm thực hiện:** Phạm Văn Dương, Nguyễn Trung Đức, Nguyễn Văn Mạnh (lớp CNTT.1 - K25)
- **Giảng viên hướng dẫn:** PGS.TS Lê Đắc Nhường

> **Lưu ý:** đây là sản phẩm học tập chạy trên mạng cục bộ, dùng dữ liệu giả lập. Đây không phải dịch vụ chính thức của nhà trường và chưa được kiểm toán bảo mật.

---

## 1. Chức năng

| Chức năng | Thành phần | Ghi chú |
|---|---|---|
| Triển khai Smart Contract | `scripts/deploy.js` | Ghi địa chỉ hợp đồng vào `deployed-address.json` |
| Tạo mã băm SHA-256 | `scripts/create-hash.js` | Băm `JSON.stringify` của dữ liệu chứng chỉ |
| Lưu dữ liệu lên IPFS | `scripts/upload-ipfs.js` | Qua Pinata, ghi CID vào `ipfs-cid.json` |
| Phát hành chứng chỉ | `scripts/issue.js` | Gọi `issueCertificate()`; chỉ admin được gọi |
| Thu hồi chứng chỉ | `scripts/revoke.js` | Gọi `revokeCertificate()`; chỉ admin được gọi |
| Tạo mã QR | `scripts/generate-qr.js` | QR chứa URL `/verify/<mã chứng chỉ>` |
| Tra cứu và xác minh | `server.js`, `public/index.html` | Website và API, người xác minh không cần ví |

## 2. Kiến trúc tổng quan

```
 Người vận hành (Issuer/Admin)                    Bên xác minh (Verifier)
   |  scripts: deploy / issue / revoke                 |  trình duyệt / quét QR
   |  upload-ipfs / create-hash / generate-qr          v
   v                                          +-------------------+
+------------------+    giao dịch (ethers)    |  server.js        |
| Hardhat node     |<-------------------------|  (Express, :3000) |
| (mạng cục bộ)    |   getCertificate() (đọc) |  public/index.html|
|  CertificateRegistry.sol                    +---------+---------+
+------------------+                                    |
                                                        | đọc data/certificates/<id>.json
 Pinata (IPFS): lưu JSON, trả CID                       | tính lại SHA-256, so với hash on-chain
```

### Dữ liệu on-chain và off-chain

| Dữ liệu | Nơi lưu |
|---|---|
| Mã chứng chỉ, hash SHA-256, CID IPFS, địa chỉ issuer, thời điểm phát hành, trạng thái thu hồi | **On-chain** (Smart Contract) |
| Nội dung chứng chỉ (loại bằng, ngành, đơn vị cấp, ngày cấp) | **Off-chain**: `data/certificates/*.json`, IPFS |
| Thông tin cá nhân thật (họ tên, ngày sinh, mã sinh viên) | **Không đưa** lên chuỗi hay IPFS trong bản demo |

### Smart Contract `CertificateRegistry`

| Hàm / sự kiện | Quyền | Mô tả |
|---|---|---|
| `constructor()` | - | Người triển khai trở thành `admin` |
| `issueCertificate(id, hash, cid)` | `onlyAdmin` | Ghi bản ghi mới. Từ chối ID rỗng, hash bằng 0, ID đã tồn tại |
| `revokeCertificate(id)` | `onlyAdmin` | Đánh dấu `revoked = true`, không xóa bản ghi. Từ chối nếu không tồn tại hoặc đã thu hồi |
| `verifyCertificate(id, hash)` | công khai (view) | `true` nếu tồn tại, chưa thu hồi và hash khớp |
| `getCertificate(id)` | công khai (view) | Trả về hash, CID, issuer, issuedAt, revoked, exists |
| Event `CertificateIssued`, `CertificateRevoked` | - | Phục vụ theo dõi và truy vết |

## 3. Cấu trúc thư mục

```
blockchain-certificate/
├── contracts/
│   └── CertificateRegistry.sol     # Smart Contract
├── scripts/
│   ├── deploy.js                   # triển khai hợp đồng
│   ├── create-hash.js              # tạo SHA-256
│   ├── upload-ipfs.js              # upload JSON lên IPFS (Pinata)
│   ├── issue.js                    # phát hành
│   ├── revoke.js                   # thu hồi
│   └── generate-qr.js              # tạo mã QR
├── data/
│   ├── certificate.json            # dữ liệu dùng cho upload IPFS và tạo QR
│   └── certificates/               # dữ liệu từng chứng chỉ (CERT-2026-000x.json)
├── public/index.html               # giao diện tra cứu
├── server.js                       # máy chủ web + API xác minh
├── hardhat.config.js               # cấu hình Hardhat (Solidity 0.8.28, mạng localhost)
├── package.json
├── .gitignore
└── .env                            # KHÔNG đưa lên Git (xem mục 4.2)
```

Các tệp được sinh ra khi chạy (đã nằm trong `.gitignore`): `deployed-address.json`, `ipfs-cid.json`, `artifacts/`, `cache/`.

## 4. Cài đặt và cấu hình

### 4.1. Yêu cầu

- Node.js từ 18 trở lên (script upload IPFS dùng `fetch` có sẵn của Node)
- npm
- Tài khoản [Pinata](https://pinata.cloud) và một JWT API key (chỉ cần cho bước upload IPFS)

### 4.2. Cài đặt

```bash
git clone https://github.com/Slowwlly/blockchain-certificate.git
cd blockchain-certificate
npm install
npx hardhat compile
```

Tạo file `.env` ở thư mục gốc:

```env
PINATA_JWT=<JWT cua Pinata>
```

> **Bảo mật:** `.env` đã nằm trong `.gitignore`. Không commit file này, không dán JWT vào báo cáo hay ảnh chụp màn hình. Nếu JWT từng bị lộ, hãy thu hồi và tạo khóa mới trên Pinata.

## 5. Chạy thử (demo)

Cần **ít nhất hai cửa sổ terminal** tại thư mục gốc của dự án. Ví dụ dưới đây dùng PowerShell (Windows); trên Linux/macOS, thay `$env:CERTIFICATE_ID="..."` bằng `CERTIFICATE_ID=...` đặt trước lệnh.

**Terminal 1: khởi động mạng Blockchain cục bộ (giữ nguyên, không tắt)**

```bash
npx hardhat node
```

**Terminal 2: các bước còn lại**

```powershell
# 1. Triển khai hợp đồng (ghi địa chỉ vào deployed-address.json)
npx hardhat run scripts/deploy.js --network localhost

# 2. (Tùy chọn) Tạo hash để xem trước giá trị SHA-256
node scripts/create-hash.js

# 3. Upload dữ liệu chứng chỉ lên IPFS (đọc data/certificate.json, ghi ipfs-cid.json)
node scripts/upload-ipfs.js

# 4. Phát hành chứng chỉ lên chuỗi (đọc data/certificates/<id>.json và ipfs-cid.json)
$env:CERTIFICATE_ID="CERT-2026-0002"
npx hardhat run scripts/issue.js --network localhost

# 5. Chạy website xác minh
node server.js
```

Mở trình duyệt:

- Trang chủ: <http://localhost:3000>
- Xác minh trực tiếp: <http://localhost:3000/verify/CERT-2026-0002>
- API: `GET http://localhost:3000/api/verify/CERT-2026-0002`

**Thu hồi chứng chỉ và kiểm tra lại**

```powershell
$env:CERTIFICATE_ID="CERT-2026-0002"
npx hardhat run scripts/revoke.js --network localhost
```

Tải lại trang xác minh: trạng thái chuyển sang `REVOKED`.

**Tạo mã QR**

```powershell
node scripts/generate-qr.js
```

Ảnh QR được lưu ở thư mục gốc, tên dạng `CERT-2026-0002-QR.png`.

> **Lưu ý khi tạo QR:** địa chỉ IP trong `scripts/generate-qr.js` hiện được gán cứng (`10.0.233.70`). Hãy sửa thành địa chỉ IPv4 của máy đang chạy `server.js` (server in địa chỉ LAN khi khởi động). Điện thoại phải cùng mạng LAN và tường lửa phải cho phép cổng 3000.

> **Lưu ý khi tắt/mở lại `hardhat node`:** mạng cục bộ **mất toàn bộ dữ liệu** khi khởi động lại. Khi đó phải chạy lại bước 1 (deploy) và bước 4 (issue).

### Các trạng thái API trả về

| `status` | Ý nghĩa |
|---|---|
| `VALID` | Có bản ghi, hash khớp, chưa thu hồi |
| `REVOKED` | Chứng chỉ đã bị thu hồi |
| `HASH_MISMATCH` | Dữ liệu đối chiếu không khớp hash trên chuỗi |
| `NOT_FOUND` | Không có bản ghi trên chuỗi |
| `DATA_NOT_FOUND` / `DATA_ID_MISMATCH` | Thiếu hoặc sai file dữ liệu `data/certificates/<id>.json` |
| `SYSTEM_NOT_READY` | Chưa deploy hợp đồng hoặc chưa biên dịch |
| `ERROR` | Lỗi kết nối mạng Hardhat/hợp đồng |

## 6. Kiểm thử

Phát hành chứng chỉ thành công.
Xác minh chứng chỉ hợp lệ.
Thu hồi chứng chỉ thành công.
Xác minh chứng chỉ sau thu hồi trả về REVOKED.

## 7. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| `Chua deploy Smart Contract` / `SYSTEM_NOT_READY` | Chưa chạy `npx hardhat compile` và `deploy.js`, hoặc đã khởi động lại node mà chưa deploy lại |
| `Only admin` | Giao dịch không do tài khoản đã deploy gửi. Script mặc định dùng tài khoản đầu tiên của Hardhat |
| `Already exists` | Mã chứng chỉ đã được phát hành, hãy dùng mã khác |
| `DATA_NOT_FOUND` | Thiếu file `data/certificates/<id>.json` cho mã đang tra cứu |
| `Khong tim thay PINATA_JWT` | Chưa tạo `.env` hoặc sai tên biến |
| CID hiển thị rỗng | `issue.js` chỉ dùng CID nếu `ipfs-cid.json` khớp mã đang phát hành. Cần upload IPFS **trước** khi phát hành và đúng chứng chỉ |
| QR không mở được trên điện thoại | IP trong QR là `localhost` hoặc sai; khác mạng LAN; tường lửa chặn cổng 3000 |

## 8. Phần tự phát triển và phần tham khảo

### Thư viện, công cụ và dịch vụ sử dụng (không phải sản phẩm của nhóm)

| Thành phần | Mục đích |
|---|---|
| [Hardhat](https://hardhat.org) + `@nomicfoundation/hardhat-toolbox` | Biên dịch, triển khai, mạng Ethereum cục bộ |
| [ethers.js](https://docs.ethers.org) | Tương tác với Smart Contract |
| [Express](https://expressjs.com) | Máy chủ web và API |
| [qrcode](https://www.npmjs.com/package/qrcode) | Sinh ảnh mã QR |
| [dotenv](https://www.npmjs.com/package/dotenv) | Đọc biến môi trường |
| [Pinata](https://docs.pinata.cloud) | Dịch vụ lưu trữ/pin dữ liệu IPFS |

### Phần do nhóm tự phát triển

- Smart Contract `contracts/CertificateRegistry.sol`
- Các script trong `scripts/` (deploy, hash, IPFS, issue, revoke, QR)
- Máy chủ và API xác minh `server.js`, giao diện `public/index.html`
- Dữ liệu chứng chỉ giả lập trong `data/`
- Báo cáo bài tập lớn

## 9. Giới hạn và lưu ý bảo mật

- Chỉ chạy trên mạng Hardhat cục bộ; chưa triển khai testnet/mainnet.
- Tài khoản admin là tài khoản thử nghiệm mặc định của Hardhat. **Khóa riêng của các tài khoản này là công khai**, tuyệt đối không dùng cho mạng thật.
- Mã băm hiện **chưa có salt** và dùng `JSON.stringify` nên phụ thuộc thứ tự trường. Với dữ liệu ít biến thể, có thể bị dò ngược; hướng khắc phục là thêm trường `nonce` ngẫu nhiên và chuẩn hóa dữ liệu trước khi băm.
- Hash chỉ chứng minh dữ liệu không bị thay đổi so với lúc phát hành, không chứng minh nội dung gốc là đúng.
- IPFS không mặc định bảo mật: ai biết CID đều có thể đọc nội dung. Không đưa dữ liệu cá nhân thật lên IPFS.
- Website hiện đối chiếu hash với file dữ liệu nằm trên máy chủ, chưa cho người xác minh tự tải dữ liệu lên để tính hash, và chưa tải lại nội dung từ IPFS theo CID để đối chiếu.
- Mã QR chỉ là đường dẫn, không tự chứng minh tính hợp lệ.
- Phát hành và thu hồi hiện qua dòng lệnh, chưa có giao diện quản trị và chưa dùng ví (MetaMask).

## 10. Giấy phép

Chưa chọn giấy phép.
