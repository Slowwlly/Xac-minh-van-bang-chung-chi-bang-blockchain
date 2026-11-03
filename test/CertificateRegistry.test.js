const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Bo Unit Test cho CertificateRegistry
 * Bao gom: kiem thu chuc nang, do gas, va kiem thu bao mat (access control).
 * Chay: npx hardhat test
 */
describe("CertificateRegistry", function () {
    let contract, owner, issuer, stranger;
    const CERT_ID = "CERT-2026-0001";
    const CERT_ID_2 = "CERT-2026-0002";
    // bytes32 hash mau (SHA-256 cua du lieu chung chi, dai dien 0x...)
    const HASH = ethers.keccak256(ethers.toUtf8Bytes("certificate-data-001"));
    const HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("certificate-data-002"));
    const WRONG_HASH = ethers.keccak256(ethers.toUtf8Bytes("tampered-data"));
    const CID = "QmTestCID123456789";
    const EMPTY_HASH = ethers.ZeroHash;

    beforeEach(async function () {
        [owner, issuer, stranger] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("CertificateRegistry");
        contract = await Factory.deploy();
        await contract.waitForDeployment();
    });

    // ---------- 1. Deployment ----------
    describe("Deployment", function () {
        it("Dat admin la nguoi deploy", async function () {
            expect(await contract.admin()).to.equal(owner.address);
        });
    });

    // ---------- 2. Phat hanh chung chi ----------
    describe("issueCertificate", function () {
        it("Admin phat hanh thanh cong va luu dung thong tin", async function () {
            const tx = await contract.issueCertificate(CERT_ID, HASH, CID);
            const receipt = await tx.wait();
            console.log(`   [gas] issueCertificate: ${receipt.gasUsed.toString()}`);

            const record = await contract.getCertificate(CERT_ID);
            expect(record.exists).to.equal(true);
            expect(record.certificateHash).to.equal(HASH);
            expect(record.ipfsCID).to.equal(CID);
            expect(record.issuer).to.equal(owner.address);
            expect(record.revoked).to.equal(false);
            expect(record.issuedAt).to.be.greaterThan(0);
        });

        it("Phat hanh emit event CertificateIssued", async function () {
            await expect(contract.issueCertificate(CERT_ID, HASH, CID))
                .to.emit(contract, "CertificateIssued")
                .withArgs(CERT_ID, HASH, CID, owner.address);
        });

        it("Khong cho phep ma chung chi rong", async function () {
            await expect(
                contract.issueCertificate("", HASH, CID)
            ).to.be.revertedWith("Empty ID");
        });

        it("Khong cho phep hash rong (bytes32 0x0)", async function () {
            await expect(
                contract.issueCertificate(CERT_ID, EMPTY_HASH, CID)
            ).to.be.revertedWith("Empty hash");
        });

        it("Khong cho phep phat hanh trung ma", async function () {
            await contract.issueCertificate(CERT_ID, HASH, CID);
            await expect(
                contract.issueCertificate(CERT_ID, HASH_2, CID)
            ).to.be.revertedWith("Already exists");
        });

        it("CID co the de trong (chua upload IPFS)", async function () {
            await contract.issueCertificate(CERT_ID, HASH, "");
            const record = await contract.getCertificate(CERT_ID);
            expect(record.ipfsCID).to.equal("");
        });
    });

    // ---------- 3. Xac minh ----------
    describe("verifyCertificate", function () {
        beforeEach(async function () {
            await contract.issueCertificate(CERT_ID, HASH, CID);
        });

        it("Tra ve true voi hash dung va chua bi thu hoi", async function () {
            expect(await contract.verifyCertificate(CERT_ID, HASH)).to.equal(true);
        });

        it("Tra ve false neu hash sai (du lieu bi sua doi)", async function () {
            expect(await contract.verifyCertificate(CERT_ID, WRONG_HASH)).to.equal(false);
        });

        it("Tra ve false neu chung chi khong ton tai", async function () {
            expect(await contract.verifyCertificate("CERT-KHONG-TON-TAI", HASH)).to.equal(false);
        });

        it("Tra ve false sau khi bi thu hoi (du hash dung)", async function () {
            await contract.revokeCertificate(CERT_ID);
            expect(await contract.verifyCertificate(CERT_ID, HASH)).to.equal(false);
        });
    });

    // ---------- 4. Thu hoi ----------
    describe("revokeCertificate", function () {
        beforeEach(async function () {
            await contract.issueCertificate(CERT_ID, HASH, CID);
        });

        it("Admin thu hoi thanh cong, co event", async function () {
            const tx = await contract.revokeCertificate(CERT_ID);
            const receipt = await tx.wait();
            console.log(`   [gas] revokeCertificate: ${receipt.gasUsed.toString()}`);

            await expect(tx)
                .to.emit(contract, "CertificateRevoked")
                .withArgs(CERT_ID, owner.address);

            const record = await contract.getCertificate(CERT_ID);
            expect(record.revoked).to.equal(true);
        });

        it("Khong thu hoi duoc chung chi khong ton tai", async function () {
            await expect(
                contract.revokeCertificate("CERT-KHONG-TON-TAI")
            ).to.be.revertedWith("Not found");
        });

        it("Khong thu hoi duoc 2 lan", async function () {
            await contract.revokeCertificate(CERT_ID);
            await expect(
                contract.revokeCertificate(CERT_ID)
            ).to.be.revertedWith("Already revoked");
        });
    });

    // ---------- 5. Kiem thu BAO MAT: Access Control ----------
    describe("Bao mat: Access Control (chi admin duoc quyen)", function () {
        it("Tai khoan khong phai admin KHONG the phat hanh", async function () {
            await expect(
                contract.connect(stranger).issueCertificate(CERT_ID, HASH, CID)
            ).to.be.revertedWith("Only admin");
        });

        it("Tai khoan khong phai admin KHONG the thu hoi", async function () {
            await contract.issueCertificate(CERT_ID, HASH, CID);
            await expect(
                contract.connect(stranger).revokeCertificate(CERT_ID)
            ).to.be.revertedWith("Only admin");
        });

        it("Moi nguoi deu co the doc (getCertificate / verify) - tra cuu cong khai", async function () {
            await contract.issueCertificate(CERT_ID, HASH, CID);
            // Ca tai khoan lang lai deu goi duoc cac ham view
            // Thu tu tra ve: (certificateHash, ipfsCID, issuer, issuedAt, revoked, exists)
            const record = await contract.connect(stranger).getCertificate(CERT_ID);
            expect(record[5]).to.equal(true); // exists = true
            expect(await contract.connect(stranger).verifyCertificate(CERT_ID, HASH)).to.equal(true);
        });
    });

    // ---------- 6. Do gas trung binh (danh gia hieu nang) ----------
    describe("Danh gia gas", function () {
        it("In ra gas trung binh cua cac giao dich ghi", async function () {
            const tx1 = await contract.issueCertificate(CERT_ID, HASH, CID);
            const r1 = await tx1.wait();
            const tx2 = await contract.issueCertificate(CERT_ID_2, HASH_2, "");
            const r2 = await tx2.wait();
            const tx3 = await contract.revokeCertificate(CERT_ID);
            const r3 = await tx3.wait();
            console.log(`   [gas] issue (co CID): ${r1.gasUsed.toString()}`);
            console.log(`   [gas] issue (khong CID): ${r2.gasUsed.toString()}`);
            console.log(`   [gas] revoke: ${r3.gasUsed.toString()}`);
            expect(r1.gasUsed).to.be.greaterThan(0);
        });
    });
});
