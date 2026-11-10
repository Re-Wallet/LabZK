pragma circom 0.5.45;

template Identity() {
    signal input in;
    signal output out;

    out <== in;
}

component main = Identity();
