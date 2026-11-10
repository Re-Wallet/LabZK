pragma circom 0.5.46;

template ProofOfKnowledge() {
    signal input secreto;
    signal input seed;
    signal output nullifier;

    component poseidon = Poseidon(2);

    poseidon.inputs[0] <== secreto;
    poseidon.inputs[1] <== seed;
    nullifier <== poseidon.out;
}

component main = ProofOfKnowledge();
