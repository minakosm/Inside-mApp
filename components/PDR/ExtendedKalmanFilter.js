import { Gravity } from "expo-sensors/build/DeviceMotion";
import  * as mathjs from "mathjs";
import { Component } from "react";

// As proposed in AHRS (https://ahrs.readthedocs.io/en/latest/index.html)
export class ExtendedKalmanFilter {
    constructor(samplePeriod, noiseVariances) {
        this._firstRunFlag = true;
        this.SamplePeriod = samplePeriod / 1000;    // Given in ms
        this.GyroscopeNoiseVar = noiseVariances[0];
        this.AccelerometerNoiseVar = noiseVariances[1];
        this.MagnetometerNoiseVar = noiseVariances[2];

        this.P = mathjs.identity(4);
        
        this.Quaternion = [1, 0, 0, 0];
    }

    getSamplePeriod() {return this.SamplePeriod;}
    getQuaternion() {return [this.Quaternion[0], this.Quaternion[1], this.Quaternion[2], this.Quaternion[3]];}
    getGyroNoiseVar() {return this.GyroscopeNoiseVar;};
    getAccelNoiseVar() {return this.AccelerometerNoiseVar;}
    getMagnNoiseVar() {return this.MagnetometerNoiseVar;}

    setSamplePeriod(s) {this.SamplePeriod = s;}
    setQuaternion(q) {
        this.Quaternion[0] = q[0];
        this.Quaternion[1] = q[1];
        this.Quaternion[2] = q[2];
        this.Quaternion[3] = q[3];
    }

    getEulerAngles(){return this._calcEulerAngles(this.Quaternion);}

    _calcEulerAngles(q) {
        let yaw, pitch, roll;
        let rot = this._quat2rot(q);
        let check = rot.get([2,0]);

        if(check > 0.99999){
            yaw = 0;
            pitch = Math.PI/2;
            roll = Math.atan2(rot.get([0,1]), rot.get([0,2]));
        }else if(check < -0.99999){
            yaw = 0;
            pitch = -Math.PI/2;
            roll = Math.atan2(-rot.get([0,1]), -rot.get([0,2]))
        } else {
            yaw = Math.atan2(rot.get([1,0]), rot.get([0,0]));
            pitch = Math.asin(-rot.get([2,0]));
            roll = Math.atan2(rot.get([2,1]), rot.get([2,2]));           
        }

        yaw *= 180/Math.PI;
        pitch *= 180/Math.PI;
        roll *= 180/Math.PI;

        return [yaw, pitch, roll];
    }

    _quat2rot(q) {
        let qw, qx, qy, qz;
        qw = q[0];
        qx = q[1];
        qy = q[2];
        qz = q[3];

        let c11 = qw*qw + qx*qx - qy*qy - qz*qz;
        let c12 = 2 * (qx*qy - qw*qz);
        let c13 = 2 * (qx*qz + qw*qy);

        let c21 = 2 * (qx*qy + qw*qz);
        let c22 = qw*qw - qx*qx + qy*qy - qz*qz;
        let c23 = 2 * (qy*qz - qw*qx);
        
        let c31 = 2 * (qx*qz - qw*qy);
        let c32 = 2 * (qy*qz + qw*qx);
        let c33 = qw*qw - qx*qx - qy*qy + qz*qz;

        return mathjs.matrix([[c11, c12, c13], [c21, c22, c23], [c31, c32, c33]]);
    }

    _initializeQuaternion(initAcc, initMag) {
        let norm;
        let qw, qx, qy, qz;
        
        let ax = initAcc.x * Gravity;
        let ay = initAcc.y * Gravity;
        let az = initAcc.z * Gravity;

        norm = Math.sqrt(ax*ax + ay*ay + az*az);
        if(norm == 0) {return;}
        norm = 1/norm;

        ax *= norm;
        ay *= norm;
        az *= norm;
    
        let mx = initMag.x;
        let my = initMag.y;
        let mz = initMag.z;

        norm = Math.sqrt(mx*mx + my*my + mz*mz);
        if(norm == 0) {return;}
        norm = 1/norm;

        mx *= norm;
        my *= norm;
        mz *= norm;

       
        let axm = mathjs.cross([ax, ay, az], [mx, my, mz]);
        let axmxa = mathjs.cross(axm, [ax, ay, az]);
        // Calculate Rotation Matrix C = [(AxM)xA AxM A]
        // (AxM)xA
        let c11 = axmxa[0];
        let c12 = axmxa[1];
        let c13 = axmxa[2];
        // Normalize 1st column
        norm = 1/Math.sqrt(c11*c11 + c12*c12 + c13*c13);
        c11 *= norm;
        c12 *= norm;
        c13 *= norm;

        // AxM
        let c21 = axm[0];
        let c22 = axm[1];
        let c23 = axm[2];

        // Normalize 2nd column
        norm = 1/Math.sqrt(c21*c21 + c22*c22 + c23*c23);
        c21 *= norm;
        c22 *= norm;
        c23 *= norm;

        //A
        let c31 = ax;
        let c32 = ay;
        let c33 = az; 

        // Normalize 3rd Column
        norm = 1/Math.sqrt(c31*c31 + c32*c32 + c33*c33);
        c31 *= norm;
        c32 *= norm;
        c33 *= norm;

        // Calculate Initial Quaternion Value
        qw = 0.5 * Math.sqrt(c11 + c22 + c33 + 1);
        qx = 0.5 * Math.sign(c32 - c23) * Math.sqrt(c11 - c22 - c33 + 1);
        qy = 0.5 * Math.sign(c13 - c31) * Math.sqrt(c22 - c33 - c11 + 1);
        qz = 0.5 * Math.sign(c21 - c12) * Math.sqrt(c33 - c11 - c22 + 1);

        for(let x of [qw, qx, qy, qz]){
            if (isNaN(Number(x))){
                console.log(`FOUND = ${x} Nan`);
                return;
            }
        }

        this.Quaternion[0] = qw;
        this.Quaternion[1] = qx;
        this.Quaternion[2] = qy;
        this.Quaternion[3] = qz;

        console.log(`INITIAL QUATERNION = [${this.Quaternion[0]} ${this.Quaternion[1]} ${this.Quaternion[2]} ${this.Quaternion[3]}]`);
        this._firstRunFlag = false;
    }

    _update(accDataObj, gyroDataObj, magDataObj) {
        if(this._firstRunFlag){
            this._initializeQuaternion(accDataObj, magDataObj);
            return;
        }
        let norm;

        let qw = this.Quaternion[0];
        let qx = this.Quaternion[1];
        let qy = this.Quaternion[2];
        let qz = this.Quaternion[3];

        let gx = gyroDataObj.x * (Math.PI / 180);
        let gy = gyroDataObj.y * (Math.PI / 180); 
        let gz = gyroDataObj.z * (Math.PI / 180);


        let ax = accDataObj.x * Gravity;
        let ay = accDataObj.y * Gravity;
        let az = accDataObj.z * Gravity;

        norm = Math.sqrt(ax*ax + ay*ay + az*az);
        if(norm == 0) {return;}
        norm = 1/norm;

        ax *= norm;
        ay *= norm;
        az *= norm;

        let mx = magDataObj.x;
        let my = magDataObj.y;
        let mz = magDataObj.z;

        norm = Math.sqrt(mx*mx + my*my + mz*mz);
        if(norm == 0) {return;}
        norm = 1/norm;

        mx *= norm;
        my *= norm;
        mz *= norm;

        // ESTIMATION STEP - (est_q, estP) 
        let F,W,Q;
        let est_qw, est_qx, est_qy, est_qz, estP;

        est_qw = qw + 0.5*this.SamplePeriod * (-gx*qx - gy*qy - gz*qz);
        est_qx = qx + 0.5*this.SamplePeriod * (gx*qw - gy*qz + gz*qy);
        est_qy = qy + 0.5*this.SamplePeriod * (gx*qz + gy*qw - gz*qx);
        est_qz = qz + 0.5*this.SamplePeriod * (-gx*qy + gy*qx + gz*qw);

        F = mathjs.matrix([[1, -0.5*this.SamplePeriod*gx, -0.5*this.SamplePeriod*gy, -0.5*this.SamplePeriod*gz],
                        [0.5*this.SamplePeriod*gx, 1, 0.5*this.SamplePeriod*gz, -0.5*this.SamplePeriod*gy],
                        [0.5*this.SamplePeriod*gy, -0.5*this.SamplePeriod*gz, 1, 0.5 * this.SamplePeriod*gx],
                        [0.5*this.SamplePeriod*gz, 0.5*this.SamplePeriod*gy, -0.5*this.SamplePeriod*gx, 1]]);

        W = mathjs.multiply(mathjs.matrix([[-qx, -qy, -qz], [qw, -qz, qy], [qz, qw, -qx], [-qy, qx, qw]]), 0.5*this.SamplePeriod);

        Q = mathjs.multiply(this.GyroscopeNoiseVar, W, mathjs.transpose(W));

        estP = mathjs.multiply(F, this.P, mathjs.transpose(F));
        estP = mathjs.add(estP, Q);

        // CORRECTION STEP
        let g, r;
        let z, h, v, S, K;
        let H, R;

        // Measurements mathjs.matrix 
        z = mathjs.matrix([[ax], [ay], [az], [mx], [my], [mz]]);

        // Global References (East-North-Up)
        g = [0, 0, 1];  // gravity 
        r = [0, 1, 0];  // earth's magnetic field

        let rotation = mathjs.matrix([[1-2*(est_qy*est_qy + est_qz*est_qz), 2*(est_qx*est_qy - est_qw*est_qz), 2*(est_qx*est_qz + est_qw*est_qy)],
                                   [2*(est_qx*est_qy + est_qw*est_qz), 1-2*(est_qx*est_qx + est_qz*est_qz), 2*(est_qy*est_qz - est_qw*est_qx)],
                                   [2*(est_qx*est_qz - est_qw*est_qy), 2*(est_qw*est_qx + est_qy*est_qz), 1-2*(est_qx*est_qx + est_qy*est_qy)]]);

        h = mathjs.matrix([[mathjs.multiply(rotation, mathjs.transpose(g))],[mathjs.multiply(rotation, mathjs.transpose(r))]]).resize([6,1]);

        H = mathjs.matrix([[-est_qy, est_qz, -est_qw, est_qx], [est_qx, est_qw, est_qz, est_qy], [0, -2*est_qx, -2*est_qy, 0], 
                         [est_qz, est_qy, est_qx, est_qw], [0, -2*est_qx, 0, -2*est_qz], [-est_qx, -est_qw, est_qz, est_qy]]).resize([6,4]);
        H = mathjs.multiply(H,2);

        R = mathjs.matrix([[mathjs.multiply(this.AccelerometerNoiseVar, mathjs.identity(3)), mathjs.zeros(3,3)], [mathjs.zeros(3,3), mathjs.multiply(this.MagnetometerNoiseVar, mathjs.identity(3))]]).resize([6,6]);
        v = mathjs.subtract(z, h);

        S = mathjs.multiply(H, estP, mathjs.transpose(H));
        S = mathjs.add(S, R);

        if(mathjs.det(S) == 0){
            console.log(`det of S is 0, Skipping Update`);
            return;
        }

        K = mathjs.multiply(estP, mathjs.transpose(H), mathjs.inv(S));

        let step = mathjs.multiply(K,v);

        qw = est_qw + step.get([0,0]);
        qx = est_qx + step.get([1,0]);
        qy = est_qy + step.get([2,0]);
        qz = est_qz + step.get([3,0]);
        
        norm = 1/Math.sqrt(qw*qw + qx*qx + qy*qy + qz*qz);
        if(norm == 0){
            return;
        }

        this.Quaternion[0] = qw * norm;
        this.Quaternion[1] = qx * norm;
        this.Quaternion[2] = qy * norm;
        this.Quaternion[3] = qz * norm;

        this.P = mathjs.multiply(mathjs.subtract(mathjs.identity(4), mathjs.multiply(K,H)), estP);
    }

    _reset() {
        this._firstRunFlag = true;
        this.P = mathjs.identity(4);     
    }
}



// As proposed (https://thepoorengineer.com/en/attitude-determination/)
export class ExtendedKalmanFilter2 {
    constructor(samplePeriod){
        this.Quaternion = [1, 0, 0, 0];
        this.Bias = [0, 0, 0];

        this.State = mathjs.transpose(mathjs.matrix([mathjs.concat(this.Quaternion, this.Bias)]));
        this.P = mathjs.multiply(0.01, mathjs.identity(7));
        this.Q = mathjs.multiply(0.001, mathjs.identity(7));
        this.R = mathjs.multiply(0.1, mathjs.identity(6));

        this.SamplePeriod = samplePeriod / 1000; // in ms
        this.accelReference = mathjs.matrix([[0],[0],[1]]);
        this.magReference = mathjs.matrix([[0], [1], [0]])
    }

    getQuaternion(){return [this.Quaternion[0], this.Quaternion[1], this.Quaternion[2], this.Quaternion[3]]}
    getBias(){return [this.Bias[0], this.Bias[1], this.Bias[2]]}
    getP(){return this.P}
    getQ(){return this.Q}
    getR(){return this.R}

    getEulerAngles(){
        return this._calcEulerAngles(this.Quaternion);
    }

    setQuaternion(q) {
        this.Quaternion[0] = q[0];
        this.Quaternion[1] = q[1];
        this.Quaternion[2] = q[2];
        this.Quaternion[3] = q[3];
    }

    _quat2rot(q) {
        let qw, qx, qy, qz;
        qw = q[0];
        qx = q[1];
        qy = q[2];
        qz = q[3];

        let c11 = qw*qw + qx*qx - qy*qy - qz*qz;
        let c12 = 2 * (qx*qy - qw*qz);
        let c13 = 2 * (qx*qz + qw*qy);

        let c21 = 2 * (qx*qy + qw*qz);
        let c22 = qw*qw - qx*qx + qy*qy - qz*qz;
        let c23 = 2 * (qy*qz - qw*qx);
        
        let c31 = 2 * (qx*qz - qw*qy);
        let c32 = 2 * (qy*qz + qw*qx);
        let c33 = qw*qw - qx*qx - qy*qy + qz*qz;

        return mathjs.matrix([[c11, c12, c13], [c21, c22, c23], [c31, c32, c33]]);
    }

    _calcEulerAngles(q) {
        let yaw, pitch, roll;
        let rot = this._quat2rot(q);
        let check = rot.get([2,0]);

        if(check > 0.99999){
            yaw = 0;
            pitch = Math.PI/2;
            roll = Math.atan2(rot.get([0,1]), rot.get([0,2]));
        }else if(check < -0.99999){
            yaw = 0;
            pitch = -Math.PI/2;
            roll = Math.atan2(-rot.get([0,1]), -rot.get([0,2]))
        } else {
            yaw = Math.atan2(rot.get([1,0]), rot.get([0,0]));
            pitch = Math.asin(-rot.get([2,0]));
            roll = Math.atan2(rot.get([2,1]), rot.get([2,2]));           
        }

        yaw *= 180/Math.PI;
        pitch *= 180/Math.PI;
        roll *= 180/Math.PI;

        return [yaw, pitch, roll];
    }

    reset() {
        this.P = mathjs.multiply(0.01, mathjs.identity(7));
        this.Q = mathjs.multiply(0.001, mathjs.identity(7));
        this.R = mathjs.multiply(0.1, mathjs.identity(6));

        this.Bias = [0, 0, 0];
        this.Quaternion = [1, 0, 0, 0];
        this.State = mathjs.transpose(mathjs.matrix([mathjs.concat(this.Quaternion, this.Bias)]));

    }

    update(accDataObj, gyroDataObj, magDataObj){
        let norm;

        let wx, wy, wz;
        let ax, ay, az;
        let mx, my, mz;
        
        wx = gyroDataObj.x;
        wy = gyroDataObj.y;
        wz = gyroDataObj.z;
        let w = mathjs.matrix([[wx], [wy], [wz]]);

        ax = accDataObj.x;
        ay = accDataObj.y;
        az = accDataObj.z;

        // Normalize Acc Data
        norm = Math.sqrt(ax*ax + ay*ay + az*az);
        if(norm == 0) {return;}
        norm = 1/norm;

        ax *= norm;
        ay *= norm;
        az *= norm;
        let a = mathjs.matrix([[ax], [ay], [az]]);

        mx = magDataObj.x;
        my = magDataObj.y;
        mz = magDataObj.z;

        // Normalize Mag Data
        norm = Math.sqrt(mx*mx + my*my + mz*mz);
        if(norm == 0) {return;}
        norm = 1/norm;

        mx *= norm;
        my *= norm;
        mz *= norm;
        let m = mathjs.matrix([[mx], [my], [mz]]);

        let qw, qx, qy, qz;
        let bx, by, bz;

        // Assign state variables to local variables for simplicity
        qw = this.State.get([0,0]);
        qx = this.State.get([1,0]);
        qy = this.State.get([2,0]);
        qz = this.State.get([3,0]);
        bx = this.State.get([4,0]);
        by = this.State.get([5,0]);
        bz = this.State.get([6,0]);

        // ESTIMATION STEP - (est_q, estP) 
        let A, B, Ha, Hm, C;
        let estState, estP;
        let skewQ;

        skewQ = mathjs.matrix([[-qx, -qy, -qz], [qw, -qz, qy], [qz, qw, -qx], [-qy, qx, qw]]);
        let A1 = mathjs.concat(mathjs.identity(4), mathjs.multiply(-0.5*this.SamplePeriod, skewQ));
        let A2 = mathjs.concat(mathjs.zeros([3,4]), mathjs.identity(3));
        A = mathjs.concat(A1,A2,0);

        B = mathjs.concat(mathjs.multiply(0.5*this.SamplePeriod, skewQ), mathjs.zeros(3,3), 0);

        estState = mathjs.add(mathjs.multiply(A, this.State), mathjs.multiply(B,w));
        estP = mathjs.add(mathjs.multiply(A, this.P, mathjs.transpose(A)), this.Q);

        let q_est = mathjs.squeeze(estState.subset(mathjs.index([0,1,2,3],[0])));
        let rotC = this._quat2rot([q_est.get([0]), q_est.get([1]), q_est.get([2]), q_est.get([3])]);
        let est_a = mathjs.multiply(rotC, this.accelReference);
        let est_m = mathjs.multiply(rotC, this.magReference);

        Ha = mathjs.multiply(-2, mathjs.matrix([[-q_est.get([2]), q_est.get([3]), -q_est.get([0]), q_est.get([1])], [q_est.get([1]), q_est.get([0]), q_est.get([3]), q_est.get([2])], [q_est.get([0]), -q_est.get([1]), -q_est.get([2]), -q_est.get([3])]]));
        Hm = mathjs.multiply(-2, mathjs.matrix([[q_est.get([3]), q_est.get([2]), q_est.get([1]), q_est.get([0])], [q_est.get([0]), -q_est.get([1]), q_est.get([2]), -q_est.get([3])], [-q_est.get([1]), -q_est.get([0]), q_est.get([3]), q_est.get([2])]]));

        let C1 = mathjs.concat(Ha, mathjs.zeros(3,3));
        let C2 = mathjs.concat(Hm, mathjs.zeros(3,3));
        C = mathjs.concat(C1, C2).resize([6,7]);

        let est_y = mathjs.concat(est_a, est_m,0);

        // UPDATE STEP
        let S, K, measurements;

        S = mathjs.add(mathjs.multiply(C, estP, mathjs.transpose(C)), this.R);
        if(mathjs.det(S) == 0){
            console.log(`Determinant of S = 0, Skipping Update`);
            return;
        }

        K = mathjs.multiply(estP, mathjs.transpose(C), mathjs.inv(S));
        measurements = mathjs.concat(a,m,0);

        this.State = mathjs.add(estState, mathjs.multiply(K, mathjs.subtract(measurements, est_y)));

        let new_qw = this.State.get([0,0]);
        let new_qx = this.State.get([1,0]);
        let new_qy = this.State.get([2,0]);
        let new_qz = this.State.get([3,0]);

        norm = Math.sqrt(new_qw*new_qw + new_qx*new_qx + new_qy*new_qy + new_qz*new_qz);
        if(norm == 0){return;}
        norm = 1/norm

        new_qw *= norm;
        new_qx *= norm;
        new_qy *= norm;
        new_qz *= norm;

        this.Quaternion[0] = new_qw;
        this.Quaternion[1] = new_qx; 
        this.Quaternion[2] = new_qy;
        this.Quaternion[3] = new_qz;

        this.Bias = mathjs.squeeze(this.State.subset(mathjs.index([4,5,6], [0])));
        this.Bias = [this.Bias.get([0]), this.Bias.get([1]), this.Bias.get([2])];
        this.State.subset(mathjs.index([0,1,2,3],[0]), this.Quaternion);        
    }
}