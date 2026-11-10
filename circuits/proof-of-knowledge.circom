pragma circom 2.0.0;

template ProofOfKnowledge() {
    signal input secreto;
    signal input seed;
    signal output nullifier;

    // Simple deterministic function: secret + seed = nullifier
    nullifier <== secreto + seed;
}

component main = ProofOfKnowledge();
