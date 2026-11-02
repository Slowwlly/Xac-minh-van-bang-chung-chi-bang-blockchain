
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CertificateRegistry {
    address public admin;

    struct Certificate {
        bytes32 certificateHash;
        string ipfsCID;
        address issuer;
        uint256 issuedAt;
        bool revoked;
        bool exists;
    }

    mapping(string => Certificate) private certificates;

    event CertificateIssued(
        string certificateId,
        bytes32 certificateHash,
        string ipfsCID,
        address issuer
    );

    event CertificateRevoked(
        string certificateId,
        address revokedBy
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

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

    function verifyCertificate(
        string calldata certificateId,
        bytes32 suppliedHash
    ) external view returns (bool) {
        Certificate storage cert = certificates[certificateId];

        return cert.exists
            && !cert.revoked
            && cert.certificateHash == suppliedHash;
    }

    function revokeCertificate(
        string calldata certificateId
    ) external onlyAdmin {
        require(certificates[certificateId].exists, "Not found");
        require(!certificates[certificateId].revoked, "Already revoked");

        certificates[certificateId].revoked = true;

        emit CertificateRevoked(certificateId, msg.sender);
    }

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
