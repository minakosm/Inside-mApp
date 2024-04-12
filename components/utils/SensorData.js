import { filter } from "./Filters";

class SensorData {
    constructor() {
        this.x = [];
        this.y = [];
        this.z = [];
    }

    setData(sensorDataObj) {
        this.x = sensorDataObj.x;
        this.y = sensorDataObj.y;
        this.z = sensorDataObj.z;
    }

    getData() {
        return {x:this.x, y:this.y, z: this.z};
    }

    getSingleData() {
        return {x: this.x[this.x.length-1], y: this.y[this.y.length - 1], z: this.z[this.z.length-1]}
    }

    pushData(sensorDataObj) {

        if(Array.isArray(sensorDataObj.x)){
            sensorDataObj.x.forEach(element => this.x.push(element));
            sensorDataObj.y.forEach(element => this.y.push(element));
            sensorDataObj.z.forEach(element => this.z.push(element));

        } else {
            this.x.push(sensorDataObj.x);
            this.y.push(sensorDataObj.y);
            this.z.push(sensorDataObj.z);
        }

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
        this.t = [0];
    }


}

// class AccelerometerSensorData extends SensorData {
//     constructor(...args) {
//         super(...args);
//     }

    
// }

export {SensorData};