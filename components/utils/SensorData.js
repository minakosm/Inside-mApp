class SensorData {
    constructor() {
        this.x = [];
        this.y = [];
        this.z = [];
    }

    pushData(sensorDataObj) {
        this.x.push(sensorDataObj.x);
        this.y.push(sensorDataObj.y);
        this.z.push(sensorDataObj.z);
    }

    getNorm() {
        return this.x.map((v, i) => Math.sqrt(
            Math.pow(v,2) + 
            Math.pow(this.y[i], 2) + 
            Math.pow(this.z[i], 2)));
    }

    clear() {
        this.x = [];
        this.y = [];
        this.z = [];
    }


}

// class AccelerometerSensorData extends SensorData {
//     constructor(...args) {
//         super(...args);
//     }

    
// }

export {SensorData};