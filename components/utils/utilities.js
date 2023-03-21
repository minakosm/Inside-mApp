/* This file provides helper functions that we use for exploiting data 
*/

const COEFF_LOW_0_HZ = {
    alpha: [1, -1.979133761292768, 0.979521463540373],
    beta: [0.000086384997973502, 0.000172769995947004, 0.000086384997973502],
};

const COEFF_LOW_5_HZ = {
    alpha: [1, -1.80898117793047, 0.827224480562408],
    beta: [0.095465967120306, -0.172688631608676, 0.095465967120306],
};

const COEFF_HIGH_1_HZ = {
    alpha: [1, -1.905384612118461, 0.910092542787947],
    beta: [0.953986986993339, -1.907503180919730, 0.953986986993339],
}

let NEW_DATASET = true;
let xInit = [];
let yInit = [];
let zInit = [];

export const filter = (sensorDataObj, specs) => {

    // data = [{x: Number, y: Number, z:Number}, ...]
    let data = sensorDataObj.map( measurement =>{ return measurement.data });
    // timestamps = [Number, ...]
    let timestamps = sensorDataObj.map( measurement => { return measurement.timestamps });

    let assert = (data.length === timestamps.length);
    if(!assert){
        throw new Error('Asserton Failed: Data/Timestamp length missmatch');
    }

    // Prepare Data 
    let _x = data.map(values => {return values.x});
    let _y = data.map(values => {return values.y});
    let _z = data.map(values => {return values.z});

    let x_f = xInit;   // 
    let y_f = yInit;   // Low Pass data
    let z_f = zInit;   //

    // Add initial values to our data
    // data(0) = data(1) = 0
    let initValue = 0;
    if(NEW_DATASET) {
        x_f = [initValue, initValue];
        y_f = [initValue, initValue];
        z_f = [initValue, initValue];
        NEW_DATASET = false;
    }
    
    //IIR FILTER
    let ALPHA = [];
    let BETA = [];

    switch (specs.type) {
        case "lowPass":
            if(specs.freq === 0){
                ALPHA = COEFF_LOW_0_HZ.alpha;
                BETA = COEFF_LOW_0_HZ.beta;
            } else if(specs.freq === 5){
                ALPHA = COEFF_LOW_5_HZ.alpha;
                BETA = COEFF_LOW_5_HZ.beta;
            } else {
                throw new Error(`NOT VALID FILTER TYPE: ${specs.type} at ${specs.freq}`);
            }
            break;
        case highPass:
            ALPHA = COEFF_HIGH_1_HZ.alpha;
            BETA = COEFF_HIGH_1_HZ.beta;
            if(specs.freq !== 1){
                throw new Error(`NOT VALID FILTER TYPE: ${specs.type} at ${specs.freq}`);
            } 
            break;
        default:
            throw new Error(`NOT VALID FILTER TYPE: ${specs.type} at ${specs.freq}`);
    }

    let res = 0;

    for(let i=2; i<_x.length; i++){
        // x gravitational
        res = ALPHA[0] * (_x[i]*BETA[0] + _x[i-1]*BETA[1] + _x[i-2]*BETA[2] - x_f[i-1]*ALPHA[1] - x_f[i-2]*ALPHA[2]);
        x_f.push(res);

        // y gravitational
        res = ALPHA[0] * (_y[i]*BETA[0] + _y[i-1]*BETA[1] + _y[i-2]*BETA[2] - y_f[i-1]*ALPHA[1] - y_f[i-2]*ALPHA[2]);
        y_f.push(res);

        // z gravitational
        res = ALPHA[0] * (_z[i]*BETA[0] + _z[i-1]*BETA[1] + _z[i-2]*BETA[2] - z_f[i-1]*ALPHA[1] - z_f[i-2]*ALPHA[2]);
        z_f.push(res);
    }

    // find high pass data from:  x_n = _x - x_f
    let x_n = _x.map((v, i) => {return v - x_f[i]});
    let y_n = _y.map((v, i) => {return v - y_f[i]});
    let z_n = _z.map((v, i) => {return v - z_f[i]});

    // Keep the last two values as initial state for next dataset
    xInit = [x_f[x_f.length - 2], x_f[x_f.length - 1]];
    yInit = [y_f[y_f.length - 2], y_f[y_f.length - 1]];
    zInit = [z_f[z_f.length - 2], z_f[z_f.length - 1]];
    
    // We now have total _x, filtered  x_f and non passed x_n for each axis
    // We use a format [[[x_f1, y_f1, z_f1], [x_n1, y_n2, z_n2]], ..., [[x_fi, y_fi, z_fi], [x_ni, y_ni, z_ni]]] -> array of arrays of arrays
    let filteredData = [];
    for(let i=0; i<x_f.length; i++){
        let passed = [x_f[i], y_f[i], z_f[i]];
        let nonPassed = [x_n[i], y_n[i], z_n[i]];
        filteredData.push([passed, nonPassed]);
    }

    return filteredData;
}

export const dotProduct = (a, b) => {
    const assert = (a.length === b.length); 
    if (!assert) {throw new Error(`Missmatched array sizes: ${a.length} \u0387 ${b.length}`);}

    return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
} 