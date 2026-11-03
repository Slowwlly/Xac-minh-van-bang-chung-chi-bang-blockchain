// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CertificateRegistry
 * @notice Hop dong thong minh quan ly chung chi/van bang tren Blockchain.
 *         Chi luu hash (SHA-256) va IPFS CID cua du lieu chung chi,
 *         KHONG luu du lieu ca nhan truc tiep on-chain.
 * @dev Phat hanh va thu hoi chi admin (nguoi deploy). Xac minh la cong khai.
 */
contract CertificateRegistry {
    /// @notice Dia chi tai khoan admin (nguoi deploy contract).
    address public admin;

    /**
     * @notice Cau truc luu tru mot chung chi tren blockchain.
     * @param certificateHash SHA-256 (bytes32) cua du lieu chung chi off-chain.
     * @param ipfsCID         CID tren IPFS cua file JSON chua du lieu chi tiet.
     * @param issuer          Dia chi vi phat hanh chung chi.
     * @param issuedAt        Thoi diem phat hanh (block timestamp).
     * @param revoked         Trang thai thu hoi (true = da bi thu hoi).
     * @param exists          Co ton tai tren he thong hay khong.
     */
    struct Certificate {
        bytes32 certificateHash;
        string ipfsCID;
        address issuer;
        uint256 issuedAt;
        bool revoked;
        bool exists;
    }

    /// @dev Mapping tu ma chung chi (vd CERT-2026-0001) -> du lieu on-chain.
    mapping(string => Certificate) private certificates;

    /// @notice Emitted khi mot chung chi moi duoc phat hanh.
    event CertificateIssued(
        string certificateId,
        bytes32 certificateHash,
        string ipfsCID,
        address issuer
    );

    /// @notice Emitted khi mot chung chi bi thu hoi.
    event CertificateRevoked(
        string certificateId,
        address revokedBy
    );

    /// @dev Chi admin moi duoc goi cac ham phat hanh/thu hoi.
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    /// @dev Constructor: dat admin = nguoi deploy contract.
    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Phat hanh mot chung chi moi (chi admin).
     * @param certificateId  Ma duy nhat cua chung chi (vd CERT-2026-0001).
     * @param certificateHash SHA-256 cua du lieu chung chi (bytes32).
     * @param ipfsCID        CID IPFS cua file JSON du lieu (co the rong).
     */
    function issueCertificate(
        string calldata certificateId,
        bytes32 certificateHash,
        string calldata ipfsCID
    ) external onlyAdmin {
        require(bytes(certificateId).length > 0, "Empty ID");
        require(certificateHash != bytes32(0), "Empty hash");
        require(!certificates[certificateId].exists, "Already exists");
        certificates[certificateId] = Certificate({
            certificateHash: certificateHash,
            ipfsCID: ipfsCID,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false,
            exists: true
        });
        emit CertificateIssued(
            certificateId,
            certificateHash,
            ipfsCID,
            msg.sender
        );
    }

    /**
     * @notice Xac minh chung chi co hop le khong (cong khai, khong can quyen).
     * @param certificateId Ma chung chi can xac minh.
     * @param suppliedHash  Hash SHA-256 tinh tu du lieu off-chain de so sanh.
     * @return True neu ton tai, chua bi thu hoi va hash khop.
     */
    function verifyCertificate(
        string calldata certificateId,
        bytes32 suppliedHash
    ) external view returns (bool) {
        Certificate storage cert = certificates[certificateId];
        return cert.exists
            && !cert.revoked
            && cert.certificateHash == suppliedHash;
    }

    /**
     * @notice Thu hoi mot chung chi (chi admin), khong the hoan tac.
     * @param certificateId Ma chung chi can thu hoi.
     */
    function revokeCertificate(
        string calldata certificateId
    ) external onlyAdmin {
        require(certificates[certificateId].exists, "Not found");
        require(!certificates[certificateId].revoked, "Already revoked");
        certificates[certificateId].revoked = true;
        emit CertificateRevoked(certificateId, msg.sender);
    }

    /**
     * @notice Lay thong tin day du cua mot chung chi (cong khai).
     * @param certificateId Ma chung chi.
     * @return certificateHash SHA-256 cua du lieu chung chi.
     * @return ipfsCID         CID IPFS cua file JSON (co the rong).
     * @return issuer          Dia chi vi phat hanh.
     * @return issuedAt        Thoi diem phat hanh (block timestamp).
     * @return revoked         True neu da bi thu hoi.
     * @return exists          True neu chung chi ton tai tren he thong.
     */
    function getCertificate(
        string calldata certificateId
    )
        external
        view
        returns (
            bytes32 certificateHash,
            string memory ipfsCID,
            address issuer,
            uint256 issuedAt,
            bool revoked,
            bool exists
        )
    {
        Certificate storage cert = certificates[certificateId];
        return (
            cert.certificateHash,
            cert.ipfsCID,
            cert.issuer,
            cert.issuedAt,
            cert.revoked,
            cert.exists
        );
    }
}
