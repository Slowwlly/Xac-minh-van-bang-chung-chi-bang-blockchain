<<<<<<< HEAD
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
=======
# Hệ thống Xác minh Chứng chỉ Blockchain (Đề tài #17)

Demo ứng dụng quản lý và xác minh văn bằng/chứng chỉ đại học bằng Blockchain (Ethereum + Hardhat + IPFS).

## Chức năng

| Chức năng | Mô tả | Quyền |
|---|---|---|
| **Phát hành chứng chỉ** | Nhập thông tin → tự tính SHA-256, upload IPFS (Pinata), ghi on-chain | Admin (cần mật khẩu) |
| **Thu hồi chứng chỉ** | Đánh dấu thu hồi trên blockchain (không thể hoàn tác) | Admin (cần mật khẩu) |
| **Tạo QR code** | Tạo QR trỏ tới trang xác minh, tải PNG về được | Công khai |
| **Xác minh** | Kiểm tra hash + trạng thái on-chain, tra cứu công khai | Công khai |

**Nguyên tắc**: On-chain **chỉ lưu hash + IPFS CID + issuer + thời gian + trạng thái** — không lưu dữ liệu cá nhân. Dữ liệu chi tiết lưu off-chain (file JSON + IPFS).

## Công nghệ sử dụng

- **Smart Contract**: Solidity ^0.8.28, Hardhat
- **Backend**: Node.js + Express + ethers.js (ký giao dịch admin phía server)
- **Frontend**: HTML/CSS/JS thuần (4 tab: Xác minh / Phát hành / Thu hồi / Tạo QR)
- **Lưu trữ phân tán**: IPFS qua Pinata (tùy chọn)
- **QR**: thư viện `qrcode`

## Cài đặt

```bash
# 1. Cai dat thu vien
npm install

# 2. Cau hinh .env (xem muc ben duoi)
cp .env.example .env   # hoac sua truc tiep .env

# 3. Compile smart contract
npx hardhat compile

# 4. Chay node blockchain local (cua so 1)
npx hardhat node

# 5. Deploy contract (cua so 2)
npx hardhat run scripts/deploy.js --network localhost

# 6. Chay web server (cua so 2)
node server.js

# 7. Mo trinh duyet: http://localhost:3000
```

## Chạy Unit Test

```bash
npx hardhat test
```
Bao gồm 18 test case: chức năng phát hành/xác minh/thu hồi, kiểm thử bảo mật access control (chỉ admin được phép), và đo gas.

## Cấu hình `.env`

| Biến | Mô tả | Mặc định |
|---|---|---|
| `PINATA_JWT` | JWT của Pinata để upload IPFS (tùy chọn) | — |
| `ADMIN_PRIVATE_KEY` | Private key tài khoản admin ký giao dịch | tài khoản #0 Hardhat |
| `RPC_URL` | Địa chỉ node blockchain | `http://127.0.0.1:8545` |
| `ADMIN_PASSWORD` | Mật khẩu bảo vệ tab Phát hành / Thu hồi | `admin123` (nên đổi) |
| `QR_BASE_URL` | URL cơ sở in trong QR (tùy chọn, mặc định tự phát hiện IP LAN) | — |

## Quét QR bằng điện thoại

1. Điện thoại và máy tính **cùng một WiFi**.
2. Khi tạo QR, hệ thống tự dùng **IP LAN** của máy (xem cửa sổ `node server.js`, dòng "Website trên mạng LAN").
3. Nếu vẫn không mở được: **cho phép Node.js qua Windows Firewall** (khi chạy `node server.js` lần đầu Windows sẽ hỏi, bấm "Cho phép truy cập" → tick cả "Mạng riêng" và "Mạng công khai").
4. Hoặc điền thủ công IP LAN vào ô "URL cơ sở" trong tab Tạo QR.

## Cấu trúc thư mục

```
blockchain-certificate/
├── contracts/           # Smart Contract (CertificateRegistry.sol)
├── scripts/             # Scripts deploy / issue / revoke / generate-qr (dung duoc)
├── test/                # Unit Test (18 test case)
├── public/              # Giao dien web (index.html 4 tab)
├── data/                # Du lieu chung chi off-chain (JSON) + IPFS CID map
├── server.js            # Backend API + phuc vu web
├── hardhat.config.js    # Cau hinh Hardhat
└── .env                 # Cau hinh moi truong (khong commit len GitHub)
```

## Phần tự phát triển (so với source tham khảo)

- Giao diện web 4 tab (Xác minh / Phát hành / Thu hồi / Tạo QR) thay vì chỉ xác minh.
- API server: `/api/issue`, `/api/revoke`, `/api/qr/:id`, `/api/status`, `/api/certificates`.
- Tự động tính SHA-256, tự upload IPFS (Pinata), tự lưu file JSON off-chain.
- Bảo mật: mật khẩu admin cho các thao tác ghi, QR tự động dùng IP LAN cho điện thoại.
- Bộ 18 Unit Test (chức năng + bảo mật access control + đo gas).

## Hạn chế của bản demo (nâng cấp trong tương lai)

- Ký giao dịch phía server dùng private key lưu ở `.env`; bản production nên dùng **MetaMask** ký phía client.
- Chạy trên Hardhat local node; có thể chuyển sang testnet (Sepolia) bằng cách sửa `RPC_URL` và `ADMIN_PRIVATE_KEY`.
- Dữ liệu off-chain lưu file JSON trên server; production nên dùng database hoặc hoàn toàn IPFS.
>>>>>>> 0b6c43d (Cập nhật hoàn chỉnh: giao diện quản trị, QR tự động IP, test bảo mật, tài liệu báo cáo)
