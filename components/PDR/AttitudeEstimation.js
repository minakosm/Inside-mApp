import { Gravity } from "expo-sensors/build/DeviceMotion";
import  math, * as mathjs from "mathjs";
import { Component } from "react";


// As proposed (https://thepoorengineer.com/en/attitude-determination/)
export class AttitudeEstimator {
    constructor(samplePeriod){
        this.Quaternion = [1, 0, 0, 0];
        this.Bias = [0, 0, 0];

        this.State = mathjs.transpose(mathjs.matrix([mathjs.concat(this.Quaternion, this.Bias)]));
        console.log(`INIT STATE = ${this.State}`);

        this.P = mathjs.multiply(0.01, mathjs.identity(7));
        this.Q = mathjs.multiply(0.001, mathjs.identity(7));
        this.R = mathjs.multiply(0.1, mathjs.identity(6));

        this.SamplePeriod = samplePeriod / 1000; // in ms
        // Local EAST-NORTH-UP coordinate system
        this.accelReference = mathjs.matrix([[0],[0],[1]]);
        // this.magReference = mathjs.matrix([[0], [mathjs.cos(5.19 *(mathjs.pi/180))], [-mathjs.sin(5.19 *(mathjs.pi/180))]]); // magnetic dip in Thessaloniki
        this.magReference = mathjs.matrix([[0], [1], [0]]);
    }

    getQuaternion(){return [this.Quaternion[0], this.Quaternion[1], this.Quaternion[2], this.Quaternion[3]]}
    getBias(){return [this.Bias[0], this.Bias[1], this.Bias[2]]}
    getP(){return this.P}
    getQ(){return this.Q}
    getR(){return this.R}

    getRotationMatrix(q) {return this._quat2rot(q);}
    getEulerAngles(){return this._calcEulerAngles(this.Quaternion);}

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
        let c12 = 2 * (qx*qy + qw*qz);
        let c13 = 2 * (qx*qz - qw*qy);

        let c21 = 2 * (qx*qy - qw*qz);
        let c22 = qw*qw - qx*qx + qy*qy - qz*qz;
        let c23 = 2 * (qy*qz + qw*qx);
        
        let c31 = 2 * (qx*qz + qw*qy);
        let c32 = 2 * (qy*qz - qw*qx);
        let c33 = qw*qw - qx*qx - qy*qy + qz*qz;

        return mathjs.matrix([[c11, c12, c13], [c21, c22, c23], [c31, c32, c33]]);
    }

    _calcEulerAngles(q) {
        let yaw, pitch, roll;
        let rot = this._quat2rot(q);
        let check = -rot.get([0,2]);

        if(check > 0.99999){
            yaw = 0;
            pitch = Math.PI/2;
            roll = Math.atan2(rot.get([1,0]), rot.get([2,0]));
        }else if(check < -0.99999){
            yaw = 0;
            pitch = -Math.PI/2;
            roll = Math.atan2(-rot.get([1,0]), -rot.get([2,0]))
        } else {
            yaw = Math.atan2(rot.get([0,1]), rot.get([0,0]));
            pitch = Math.asin(-rot.get([0,2]));
            roll = Math.atan2(rot.get([1,2]), rot.get([2,2]));           
        }          
        
        yaw *= 180/Math.PI;
        pitch *= 180/Math.PI;
        roll *= 180/Math.PI;

        return [yaw, pitch, roll];
    }

    _getJacobianMatrix(reference, q){
        let r0, r1, r2;
        let q0, q1, q2, q3;

        r0 = reference.get([0,0]);
        r1 = reference.get([1,0]);
        r2 = reference.get([2,0]);

        q0 = q[0];
        q1 = q[1];
        q2 = q[2];
        q3 = q[3];

        let j11, j12, j13, j14;
        let j21, j22, j23, j24;
        let j31, j32, j33, j34;

        j11 = q0 * r0 + q3 * r1 - q2 * r2;
        j12 = q1 * r0 + q2 * r1 + q3 * r2;
        j13 = -q2 * r0 + q1 * r1 - q0 * r2;
        j14 = -q3 * r0 + q0 * r1 + q1 * r2;
        j21 = -q3 * r0 + q0 * r1 + q1 * r2;
        j22 = q2 * r0 - q1 * r1 + q0 * r2;
        j23 = q1 * r0 + q2 * r1 + q3 * r2;
        j24 = -q0 * r0 - q3 * r1 + q2 * r2;
        j31 = q2 * r0 - q1 * r1 + q0 * r2;
        j32 = q3 * r0 - q0 * r1 - q1 * r2;
        j33 = q0 * r0 + q3 * r1 - q2 * r2;
        j34 = q1 * r0 + q2 * r1 + q3 * r2;

        return mathjs.multiply(2, mathjs.matrix([[j11, j12, j13, j14], [j21, j22, j23, j24], [j31, j32, j33, j34]]));
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

        // Assign state variables to local variables for simplicity
        qw = this.State.get([0,0]);
        qx = this.State.get([1,0]);
        qy = this.State.get([2,0]);
        qz = this.State.get([3,0]);

        // ESTIMATION STEP - (est_q, estP) 
        let A, B, Ha, Hm, C;
        let estState, estP;
        let skewQ;

        skewQ = mathjs.matrix([[-qx, -qy, -qz], [qw, -qz, qy], [qz, qw, -qx], [-qy, qx, qw]]);
        let A1 = mathjs.concat(mathjs.identity(4), mathjs.multiply(-0.5*this.SamplePeriod, skewQ));
        // console.log(`A1 = ${A1}`);
        let A2 = mathjs.concat(mathjs.zeros([3,4]), mathjs.identity(3));
        // console.log(`A2 = ${A2}`);
        A = mathjs.concat(A1,A2,0);
        // console.log(`A = ${A}`);

        B = mathjs.concat(mathjs.multiply(0.5*this.SamplePeriod, skewQ), mathjs.zeros(3,3), 0);
        // console.log(`B = ${B}`);

        estState = mathjs.add(mathjs.multiply(A, this.State), mathjs.multiply(B,w));
        estP = mathjs.add(mathjs.multiply(A, this.P, mathjs.transpose(A)), this.Q);

        let q_est = [estState.get([0,0]), estState.get([1,0]), estState.get([2,0]), estState.get([3,0])];

        norm = Math.sqrt(q_est[0]*q_est[0] + q_est[1]*q_est[1] + q_est[2]*q_est[2] + q_est[3]*q_est[3]);
        if(norm == 0){return;}
        norm = 1/norm;
        q_est[0] *= norm;
        q_est[1] *= norm;
        q_est[2] *= norm;
        q_est[3] *= norm;

        let rotC = this._quat2rot(q_est);

        Ha = this._getJacobianMatrix(this.accelReference, [qw, qx, qy, qz]);
        Hm = this._getJacobianMatrix(this.magReference, [qw, qx, qy, qz]);

        let est_a = mathjs.multiply(rotC, this.accelReference);
        let est_m = mathjs.multiply(rotC, this.magReference);

        let C1 = mathjs.concat(Ha, mathjs.zeros(3,3));
        let C2 = mathjs.concat(Hm, mathjs.zeros(3,3));
        C = mathjs.concat(C1, C2, 0);

        let est_y = mathjs.concat(est_a, est_m, 0);
        // let est_y = mathjs.multiply(C, this.State);

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
        norm = 1/norm;

        new_qw *= norm;
        new_qx *= norm;
        new_qy *= norm;
        new_qz *= norm;

        this.Quaternion = [new_qw, new_qx, new_qy, new_qz];

        this.Bias = [this.State.get([4,0]), this.State.get([5,0]), this.State.get([6,0])];
       
        this.State.set([0,0], new_qw);
        this.State.set([1,0], new_qx);
        this.State.set([2,0], new_qy);
        this.State.set([3,0], new_qz);

        this.P = mathjs.multiply(mathjs.subtract(mathjs.identity(7), mathjs.multiply(K, C)), estP);
    }
}