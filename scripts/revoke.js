
const { ethers } = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    console.log("Dang bat dau thu hoi chung chi...");

    // Lay ID chung chi can thu hoi tu bien moi truong
    const certificateId =
        process.env.CERTIFICATE_ID || "CERT-2026-0005";

    // Doc dia chi smart contract
    const addressPath = path.join(__dirname, "../deployed-address.json");
    const { address } = JSON.parse(
        fs.readFileSync(addressPath, "utf8")
    );

    // Ket noi voi smart contract
    const contract = await ethers.getContractAt(
        "CertificateRegistry",
        address
    );

    // Thu hoi chung chi
    const tx = await contract.revokeCertificate(certificateId);

    console.log("Dang cho giao dich xac nhan...");
    await tx.wait();

    console.log("Thu hoi thanh cong!");
    console.log("Certificate ID:", certificateId);
    console.log("Transaction:", tx.hash);
}

main().catch((error) => {
    console.error("Thu hoi that bai:", error);
    process.exitCode = 1;
});
