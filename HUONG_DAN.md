# HƯỚNG DẪN CẬP NHẬT v2 — Thêm Phát hành / Thu hồi / Tạo QR + Bảo mật admin

Bản cập nhật này thêm 3 chức năng vào giao diện web (không còn phải gõ lệnh trong VS Code):
1. **Phát hành chứng chỉ** — điền form → tự lưu JSON, tính SHA-256, upload IPFS (nếu có PINATA_JWT), gọi smart contract.
2. **Thu hồi chứng chỉ** — nhập mã + mật khẩu admin → thu hồi trên blockchain (có xác nhận, không thể hoàn tác).
3. **Tạo QR code** — nhập mã → hiển thị QR trên web + nút tải xuống PNG. QR trỏ tới trang xác minh.

(Giữ nguyên chức năng **Xác minh** công khai, bao gồm cả tự động xác minh khi quét QR / mở link `/verify/<id>`.)

**Mới ở v2**: thêm **mật khẩu admin** bảo vệ 2 chức năng nhạy cảm (Phát hành / Thu hồi) — người ngoài không thể tùy tiện phát hành/thu hồi chỉ bằng cách mở web.

## Các file cần thay thế

Sao chép đè (overwrite) các file sau vào thư mục `blockchain-certificate/` của nhóm:

| File trong bản cập nhật | Đường dẫn đích trong project |
|---|---|
| `server.js` | `blockchain-certificate/server.js` |
| `public/index.html` | `blockchain-certificate/public/index.html` |
| `.env` | `blockchain-certificate/.env` |

> Nếu nhóm đã sửa `.env` riêng, **đừng đè cả file** — chỉ cần thêm 3 dòng sau vào cuối `.env`:
> ```
> ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
> RPC_URL=http://127.0.0.1:8545
> ADMIN_PASSWORD=admin123
> ```
> (Đổi `admin123` thành mật khẩu nhóm tự chọn.)

## Chạy thử

1. Cửa sổ 1 — chạy node blockchain: `npx hardhat node`
2. Cửa sổ 2 — deploy (lần đầu hoặc sau khi reset node): `npx hardhat run scripts/deploy.js --network localhost`
3. Cửa sổ 2 — chạy web: `node server.js`
4. Mở `http://localhost:3000`

> Nếu gặp lỗi `Cannot find module .../hardhat/...` → `node_modules` bị hỏng/thiếu, chạy `npm install` lại.

## Sử dụng giao diện

- Tab **Xác minh** và **Tạo QR**: công khai, không cần mật khẩu.
- Tab **Phát hành** và **Thu hồi**: bắt buộc nhập **Mật khẩu admin** (mặc định `admin123`, xem `ADMIN_PASSWORD` trong `.env`). Sai mật khẩu sẽ báo lỗi 401.

## Ghi chú trình bày trong báo cáo (đề tài #17)

- **On-chain chỉ lưu**: `certificateHash` (SHA-256), `ipfsCID`, `issuer`, `issuedAt`, `revoked` — **không lưu dữ liệu cá nhân** (tên, bằng, ngành...) trực tiếp trên chain. Dữ liệu chi tiết lưu off-chain (file JSON + IPFS). → Đúng yêu cầu "không lưu dữ liệu cá nhân trực tiếp on-chain".
- **Actor**: Nhà trường/Admin (phát hành, thu hồi — cần mật khẩu + private key) vs. Công chúng (xác minh, tra cứu qua QR) → đúng mô hình phân quyền.
- **Phần tự phát triển**: giao diện 4 tab, API server (issue/revoke/qr/status/list), tự tính hash, tự upload IPFS, bảo mật mật khẩu admin, QR động theo host. → Ghi rõ phần này để được điểm tự phát triển.
- **Hạn chế của demo (nêu để thể hiện hiểu biết)**: server-side signing dùng admin private key lưu ở server; bản production nên dùng MetaMask/wallet signing ở phía client. Chạy trên Hardhat local, chưa lên testnet.
- Các script cũ trong `scripts/` vẫn dùng bình thường, bản cập nhật không phá vỡ gì.
