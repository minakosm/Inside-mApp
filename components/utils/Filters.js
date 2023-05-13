
const COEFFICIENTS_LOW_0_HZ = {
    alpha: [1, -1.979133761292768, 0.979521463540373],
    beta:  [0.000086384997973502, 0.000172769995947004, 0.000086384997973502]
}

const COEFFICIENTS_LOW_5_HZ = {
    alpha: [1, -1.80898117793047, 0.827224480562408],
    beta:  [0.095465967120306, -0.172688631608676, 0.095465967120306]
}

const COEFFICIENTS_HIGH_1_HZ = {
    alpha: [1, -1.905384612118461, 0.910092542787947],
    beta:  [0.953986986993339, -1.907503180919730, 0.953986986993339]
}


function filter(sensorDataProp, coeffs) {
    if (sensorDataProp.length < 3) {
        return sensorDataProp;
    }
    let filteredData = [0, 0];
    for(let i=2; i<sensorDataProp.length; i++){
        filteredData[i] = coeffs.alpha[0] *
                        (sensorDataProp[i] * coeffs.beta[0] + 
                        sensorDataProp[i-1] * coeffs.beta[1] +   
                        sensorDataProp[i-2] * coeffs.beta[2] -
                        filteredData[i-1] * coeffs.alpha[1] - 
                        filteredData[i-2] * coeffs.alpha[2]);
    }
    return filteredData;
}

const low_0_hz = (sensorDataProp) => filter(sensorDataProp, COEFFICIENTS_LOW_0_HZ);
const low_5_hz = (sensorDataProp) => filter(sensorDataProp, COEFFICIENTS_LOW_5_HZ);
const high_1_hz = (sensorDataProp) => filter(sensorDataProp, COEFFICIENTS_HIGH_1_HZ);

export {low_0_hz, low_5_hz, high_1_hz};