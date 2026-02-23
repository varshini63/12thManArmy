// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InsuranceClaim {
    
    // User struct
    struct User {
        string username;
        string role; // patient, hospital, insurance, admin
        string name;
        address walletAddress;
        uint256 registeredAt;
        bool exists;
    }
    
    // SSI Identity struct
    struct Identity {
        string did;
        string name;
        string email;
        string idNumber;
        string dateOfBirth;
        address owner;
        bool isVerified;
        uint256 createdAt;
        bool exists;
    }
    
    // Policy struct
    struct Policy {
        uint256 id;
        string policyNumber;
        string did;
        string patientName;
        string policyType;
        uint256 coverageAmount;
        uint256 premium;
        uint256 durationMonths;
        address createdBy;
        string insuranceCompany;
        string status; // ACTIVE, EXPIRED, CANCELLED
        uint256 createdAt;
        bool exists;
    }
    
    // Claim struct
    struct Claim {
        uint256 id;
        string claimNumber;
        uint256 policyId;
        string policyNumber;
        string did;
        string patientName;
        string claimType;
        uint256 amount;
        string description;
        string hospitalName;
        string diagnosis;
        address submittedBy;
        uint256 submittedAt;
        string status; // PENDING, APPROVED, REJECTED
        uint256 fraudScore; // Stored as percentage (0-100)
        bool isFraudulent;
        string aiDecision; // APPROVED, FLAGGED
        string mlFraudType; // NEW: NO_FRAUD, OVERBILLING, FAKE_CLAIM, etc.
        uint256 mlConfidence; // NEW: ML model confidence (0-100)
        uint256 processedAt;
        address processedBy;
        bool exists;
    }
    
    // FL Training Round struct
    struct TrainingRound {
        uint256 roundNumber;
        uint256 globalAccuracy; // Stored as percentage (0-100)
        uint256 nodesParticipated;
        uint256 totalSamples;
        uint256 timestamp;
        address triggeredBy;
    }
    
    // State variables
    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;
    address[] public userAddresses;
    
    mapping(string => Identity) public identities; // DID => Identity
    mapping(address => string) public ownerToDID;
    string[] public allDIDs;
    
    mapping(uint256 => Policy) public policies;
    mapping(string => uint256) public policyNumberToId;
    uint256 public policyCounter;
    
    mapping(uint256 => Claim) public claims;
    mapping(string => uint256) public claimNumberToId;
    uint256 public claimCounter;
    
    mapping(uint256 => TrainingRound) public trainingRounds;
    uint256 public trainingRoundCounter;
    
    address public admin;
    
    // Events
    event UserRegistered(
        address indexed userAddress,
        string username,
        string role,
        string name,
        uint256 timestamp
    );
    
    event IdentityCreated(
        string indexed did,
        address indexed owner,
        string name,
        uint256 timestamp
    );
    
    event IdentityVerified(
        string indexed did,
        address indexed verifier,
        uint256 timestamp
    );
    
    event PolicyCreated(
        uint256 indexed policyId,
        string policyNumber,
        string did,
        address indexed createdBy,
        uint256 coverageAmount,
        uint256 timestamp
    );
    
    event ClaimSubmitted(
        uint256 indexed claimId,
        string claimNumber,
        uint256 indexed policyId,
        address indexed submittedBy,
        uint256 amount,
        uint256 fraudScore,
        uint256 timestamp
    );
    
    event ClaimProcessed(
        uint256 indexed claimId,
        string status,
        address indexed processedBy,
        uint256 timestamp
    );
    
    event FLTrainingCompleted(
        uint256 indexed roundNumber,
        uint256 globalAccuracy,
        address indexed triggeredBy,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlyRegistered() {
        require(users[msg.sender].exists, "User not registered");
        _;
    }
    
    modifier onlyRole(string memory role) {
        require(
            keccak256(bytes(users[msg.sender].role)) == keccak256(bytes(role)),
            "Unauthorized role"
        );
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    // Constructor
    constructor() {
        admin = msg.sender;
        // Register admin
        users[admin] = User({
            username: "admin",
            role: "admin",
            name: "System Administrator",
            walletAddress: admin,
            registeredAt: block.timestamp,
            exists: true
        });
        usernameToAddress["admin"] = admin;
        userAddresses.push(admin);
    }
    
    // ==================== USER MANAGEMENT ====================
    
    function registerUser(
        string memory _username,
        string memory _role,
        string memory _name
    ) public {
        require(!users[msg.sender].exists, "User already registered");
        require(usernameToAddress[_username] == address(0), "Username taken");
        require(
            keccak256(bytes(_role)) == keccak256(bytes("patient")) ||
            keccak256(bytes(_role)) == keccak256(bytes("hospital")) ||
            keccak256(bytes(_role)) == keccak256(bytes("insurance")),
            "Invalid role"
        );
        
        users[msg.sender] = User({
            username: _username,
            role: _role,
            name: _name,
            walletAddress: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });
        
        usernameToAddress[_username] = msg.sender;
        userAddresses.push(msg.sender);
        
        emit UserRegistered(msg.sender, _username, _role, _name, block.timestamp);
    }
    
    function getUser(address _address) public view returns (
        string memory username,
        string memory role,
        string memory name,
        address walletAddress,
        uint256 registeredAt
    ) {
        require(users[_address].exists, "User not found");
        User memory user = users[_address];
        return (user.username, user.role, user.name, user.walletAddress, user.registeredAt);
    }
    
    function getUserByUsername(string memory _username) public view returns (
        address walletAddress,
        string memory role,
        string memory name
    ) {
        address userAddress = usernameToAddress[_username];
        require(users[userAddress].exists, "User not found");
        User memory user = users[userAddress];
        return (user.walletAddress, user.role, user.name);
    }
    
    function getAllUsers() public view returns (address[] memory) {
        return userAddresses;
    }
    
    // ==================== SSI IDENTITY ====================
    
    function createIdentity(
        string memory _did,
        string memory _name,
        string memory _email,
        string memory _idNumber,
        string memory _dateOfBirth
    ) public onlyRegistered onlyRole("patient") {
        require(!identities[_did].exists, "DID already exists");
        require(bytes(ownerToDID[msg.sender]).length == 0, "Identity already created");
        
        identities[_did] = Identity({
            did: _did,
            name: _name,
            email: _email,
            idNumber: _idNumber,
            dateOfBirth: _dateOfBirth,
            owner: msg.sender,
            isVerified: true,
            createdAt: block.timestamp,
            exists: true
        });
        
        ownerToDID[msg.sender] = _did;
        allDIDs.push(_did);
        
        emit IdentityCreated(_did, msg.sender, _name, block.timestamp);
    }
    
    function verifyIdentity(string memory _did) public view returns (bool) {
        return identities[_did].exists && identities[_did].isVerified;
    }
    
    function getIdentity(string memory _did) public view returns (
        string memory name,
        string memory email,
        address owner,
        bool isVerified,
        uint256 createdAt
    ) {
        require(identities[_did].exists, "Identity not found");
        Identity memory identity = identities[_did];
        return (identity.name, identity.email, identity.owner, identity.isVerified, identity.createdAt);
    }
    
    function getMyIdentity() public view returns (
        string memory did,
        string memory name,
        string memory email,
        string memory idNumber,
        string memory dateOfBirth
    ) {
        string memory myDID = ownerToDID[msg.sender];
        require(bytes(myDID).length > 0, "No identity found");
        Identity memory identity = identities[myDID];
        return (identity.did, identity.name, identity.email, identity.idNumber, identity.dateOfBirth);
    }
    
    function getAllIdentities() public view returns (string[] memory) {
        return allDIDs;
    }
    
    // ==================== POLICIES ====================
    
    function createPolicy(
        string memory _policyNumber,
        string memory _did,
        string memory _patientName,
        string memory _policyType,
        uint256 _coverageAmount,
        uint256 _premium,
        uint256 _durationMonths,
        string memory _insuranceCompany
    ) public onlyRegistered onlyRole("insurance") {
        require(identities[_did].exists, "Invalid DID");
        require(policyNumberToId[_policyNumber] == 0, "Policy number exists");
        
        policyCounter++;
        
        policies[policyCounter] = Policy({
            id: policyCounter,
            policyNumber: _policyNumber,
            did: _did,
            patientName: _patientName,
            policyType: _policyType,
            coverageAmount: _coverageAmount,
            premium: _premium,
            durationMonths: _durationMonths,
            createdBy: msg.sender,
            insuranceCompany: _insuranceCompany,
            status: "ACTIVE",
            createdAt: block.timestamp,
            exists: true
        });
        
        policyNumberToId[_policyNumber] = policyCounter;
        
        emit PolicyCreated(policyCounter, _policyNumber, _did, msg.sender, _coverageAmount, block.timestamp);
    }
    
    function getPolicy(uint256 _policyId) public view returns (
        string memory policyNumber,
        string memory did,
        string memory patientName,
        string memory policyType,
        uint256 coverageAmount,
        uint256 premium,
        string memory status
    ) {
        require(policies[_policyId].exists, "Policy not found");
        Policy memory policy = policies[_policyId];
        return (
            policy.policyNumber,
            policy.did,
            policy.patientName,
            policy.policyType,
            policy.coverageAmount,
            policy.premium,
            policy.status
        );
    }
    
    function getPolicyByNumber(string memory _policyNumber) public view returns (uint256) {
        uint256 policyId = policyNumberToId[_policyNumber];
        require(policyId != 0, "Policy not found");
        return policyId;
    }
    
    // ==================== CLAIMS ====================
    
    function submitClaim(
        string memory _claimNumber,
        uint256 _policyId,
        string memory _policyNumber,
        string memory _did,
        string memory _patientName,
        string memory _claimType,
        uint256 _amount,
        string memory _description,
        string memory _hospitalName,
        string memory _diagnosis,
        uint256 _fraudScore,
        bool _isFraudulent,
        string memory _aiDecision,
        string memory _mlFraudType,      // NEW parameter
        uint256 _mlConfidence            // NEW parameter
    ) public onlyRegistered onlyRole("hospital") {
        require(policies[_policyId].exists, "Invalid policy");
        require(claimNumberToId[_claimNumber] == 0, "Claim number exists");
        
        claimCounter++;
        
        claims[claimCounter] = Claim({
            id: claimCounter,
            claimNumber: _claimNumber,
            policyId: _policyId,
            policyNumber: _policyNumber,
            did: _did,
            patientName: _patientName,
            claimType: _claimType,
            amount: _amount,
            description: _description,
            hospitalName: _hospitalName,
            diagnosis: _diagnosis,
            submittedBy: msg.sender,
            submittedAt: block.timestamp,
            status: "PENDING",
            fraudScore: _fraudScore,
            isFraudulent: _isFraudulent,
            aiDecision: _aiDecision,
            mlFraudType: _mlFraudType,      // NEW field
            mlConfidence: _mlConfidence,    // NEW field
            processedAt: 0,
            processedBy: address(0),
            exists: true
        });
        
        claimNumberToId[_claimNumber] = claimCounter;
        
        emit ClaimSubmitted(claimCounter, _claimNumber, _policyId, msg.sender, _amount, _fraudScore, block.timestamp);
    }
    
    function approveClaim(uint256 _claimId) public onlyRegistered onlyRole("insurance") {
        require(claims[_claimId].exists, "Claim not found");
        require(
            keccak256(bytes(claims[_claimId].status)) == keccak256(bytes("PENDING")),
            "Claim not pending"
        );
        
        // Verify insurance company owns the policy
        uint256 policyId = claims[_claimId].policyId;
        require(policies[policyId].createdBy == msg.sender, "Not your policy");
        
        claims[_claimId].status = "APPROVED";
        claims[_claimId].processedAt = block.timestamp;
        claims[_claimId].processedBy = msg.sender;
        
        emit ClaimProcessed(_claimId, "APPROVED", msg.sender, block.timestamp);
    }
    
    function rejectClaim(uint256 _claimId) public onlyRegistered onlyRole("insurance") {
        require(claims[_claimId].exists, "Claim not found");
        require(
            keccak256(bytes(claims[_claimId].status)) == keccak256(bytes("PENDING")),
            "Claim not pending"
        );
        
        uint256 policyId = claims[_claimId].policyId;
        require(policies[policyId].createdBy == msg.sender, "Not your policy");
        
        claims[_claimId].status = "REJECTED";
        claims[_claimId].processedAt = block.timestamp;
        claims[_claimId].processedBy = msg.sender;
        
        emit ClaimProcessed(_claimId, "REJECTED", msg.sender, block.timestamp);
    }
    
    function getClaim(uint256 _claimId) public view returns (
        string memory claimNumber,
        string memory patientName,
        string memory claimType,
        uint256 amount,
        string memory status,
        uint256 fraudScore,
        bool isFraudulent,
        string memory mlFraudType,
        uint256 mlConfidence
    ) {
        require(claims[_claimId].exists, "Claim not found");
        Claim memory claim = claims[_claimId];
        return (
            claim.claimNumber,
            claim.patientName,
            claim.claimType,
            claim.amount,
            claim.status,
            claim.fraudScore,
            claim.isFraudulent,
            claim.mlFraudType,
            claim.mlConfidence
        );
    }
    // ==================== FEDERATED LEARNING ====================
    
    function recordTrainingRound(
        uint256 _globalAccuracy,
        uint256 _nodesParticipated,
        uint256 _totalSamples
    ) public onlyRegistered onlyRole("insurance") {
        trainingRoundCounter++;
        
        trainingRounds[trainingRoundCounter] = TrainingRound({
            roundNumber: trainingRoundCounter,
            globalAccuracy: _globalAccuracy,
            nodesParticipated: _nodesParticipated,
            totalSamples: _totalSamples,
            timestamp: block.timestamp,
            triggeredBy: msg.sender
        });
        
        emit FLTrainingCompleted(trainingRoundCounter, _globalAccuracy, msg.sender, block.timestamp);
    }
    
    function getTrainingRound(uint256 _roundNumber) public view returns (
        uint256 globalAccuracy,
        uint256 nodesParticipated,
        uint256 totalSamples,
        uint256 timestamp
    ) {
        TrainingRound memory round = trainingRounds[_roundNumber];
        return (round.globalAccuracy, round.nodesParticipated, round.totalSamples, round.timestamp);
    }
    
    // ==================== STATISTICS ====================
    
    function getTotalCounts() public view returns (
        uint256 totalUsers,
        uint256 totalIdentities,
        uint256 totalPolicies,
        uint256 totalClaims,
        uint256 totalTrainingRounds
    ) {
        return (
            userAddresses.length,
            allDIDs.length,
            policyCounter,
            claimCounter,
            trainingRoundCounter
        );
    }
}