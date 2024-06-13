import * as math from "mathjs";

//==============================================================================================================//
// Constants 
const WINDOW = 25;
//==============================================================================================================//
// ZEMU
const ZEMU_VAR_ACC_THRESH = 0.1;
const ZEMU_Z_LP = [];
//==============================================================================================================//
// SDUP
const SDUP_N = 6;                               // Low Pass Filter 'Order' 
const SDUP_Z_LP = [];                           // Low-Pass Acceleration Data
const SDUP_ACC_THRESHOLD = 0.6;                 // Acceleration Threshold to surpass in order to detect a step
const SDUP_MAX_TIME = 0.85;                     // Maximum Step Time Threshold
const STEP_ARRAY = [];                          // Step Lengths Array

let STEP_COUNTER = 0;
let SDUP_STEP_DETECTED = false;
let SDUP_ZERO_CROSS = false;
let SDUP_MAX = -100;
let SDUP_MIN = 100;
let SDUP_TIMEOUT = 0;
//==============================================================================================================//
// URU
const URU_N = 6;                                // Low Pass Filter 'Order'
const URU_G_LP = [];                            // Low-Pass Gyroscope Data
const URU_TURN_BUFFER = [];                     // Data Storage While inTurn
const URU_ANGLES = [-90, -45, 0, 45, 90];       // Constant Angles
const URU_VAR_THRESH = 0.1;                    // Variance Threshold to surpass in order to detect turn

let URU_IN_TURN = false;
let URU_TIMEOUT = 0;
let URU_DELTA = 0;
//==============================================================================================================//

// Object of Arrays 
class DataHistory {
    constructor() {
        this.data = {
            x: [],
            y: [],
            z: [],
        }
    }

    get() {
        return this.data;
    }

    getLast() {
        let _x = this.data.x.at(-1);
        let _y = this.data.y.at(-1);
        let _z = this.data.z.at(-1);
        
        return {x: _x, y: _y, z: _z}
    }

    // Has to be an Object of x,y,z Arrays
    set(dataObject) {
        let xExists = this.checkIfKeyExists(dataObject, "x");
        let yExists = this.checkIfKeyExists(dataObject, "y");
        let zExists = this.checkIfKeyExists(dataObject, "z");

        if (xExists && yExists && zExists) {
            this.data = {x: [dataObject.x],
                         y: [dataObject.y],
                         z: [dataObject.z]};
        }

    }

    // Push a single measurement to the class object
    push(dataObject) {
        let xExists = this.checkIfKeyExists(dataObject, "x");
        let yExists = this.checkIfKeyExists(dataObject, "y");
        let zExists = this.checkIfKeyExists(dataObject, "z");

        if (xExists && yExists && zExists) {
            this.data.x.push(dataObject.x);
            this.data.y.push(dataObject.y);
            this.data.z.push(dataObject.z);
        }
    }

    pop() {
        this.data.x.pop();
        this.data.y.pop();
        this.data.z.pop();
    }

    // Push a single measurement and remove the first from the class object
    pushAndShift(dataObject) {
        let xExists = this.checkIfKeyExists(dataObject, "x");
        let yExists = this.checkIfKeyExists(dataObject, "y");
        let zExists = this.checkIfKeyExists(dataObject, "z");

        if (xExists && yExists && zExists) {
            this.data.x.push(dataObject.x);
            this.data.y.push(dataObject.y);
            this.data.z.push(dataObject.z);

            this.data.x.shift();
            this.data.y.shift();
            this.data.z.shift();
        }
    }

    length() {
        let len = this.data.x.length;
        if (this.data.y.length === len && this.data.z.length === len) { return len; } else { throw new Error('DataHistory.length : Missmatched length of components x-y-z'); }
    }
    // utility function
    checkIfKeyExists(objectName, keyName) {
        let keyExists = Object.keys(objectName).some(key => key === keyName);
        return keyExists;
    }

    // deconstructor
    clear() {
        this.data = {
            x: [],
            y: [],
            z: [],
        }
    }

}

export class PedestrianDeadReckoning {
    // Class Constructor 
    constructor() {

        // State Variables 
        this.position = math.zeros(3, 1);
        this.velocity = math.zeros(3, 1);
        this.attitude = [1, 0, 0, 0];       // Attitude Quaternion [w, x, y, z]

        // Error Variables 
        this.dp = math.zeros(3, 1);
        this.dv = math.zeros(3, 1);
        this.da = math.zeros(3, 1);

        // Last Step History
        this.lastStepPos = math.zeros(3, 1);
        this.lastStepVel = math.zeros(3, 1);
        this.lastStepAtt = [1, 0, 0, 0];
        this.lastStepRot = math.identity(3);

        // Quaternion for Attitude Estimation
        // q = [w, x, y, z]
        this.quaternion = [1, 0, 0, 0];

        // Rotation Matrix from Quaternion 
        this.RotationMatrix = math.identity(3);

        // Sensor Biases
        this.gyroBias = math.zeros(3, 1);
        this.accBias = math.zeros(3, 1);

        // Sensor Sample Period
        this.dt = 0;

        // Data History Windows 
        this.accWindow = new DataHistory();
        this.gyroWindow = new DataHistory();

        // USER (X,Y) COORDINATES HISTORY
        this.POSITION_HISTORY = new DataHistory();
    }

    setDt(dt) {
        this.dt = dt;
    }

    // Clean Up Function
    reset() {

        // Clear State Variables 
        this.position = math.zeros(3, 1);
        this.velocity = math.zeros(3, 1);
        this.attitude = [1, 0, 0, 0];

        // Clear Error Variables 
        this.dp = math.zeros(3, 1);
        this.dv = math.zeros(3, 1);
        this.da = math.zeros(3, 1);

        // Clear Last Step History
        this.lastStepPos = math.zeros(3, 1);
        this.lastStepVel = math.zeros(3, 1);
        this.lastStepAtt = [1, 0, 0, 0];
        this.lastStepRot = math.identity(3);

        // Clear Sensor Biases
        this.gyroBias = math.zeros(3, 1);
        this.accBias = math.zeros(3, 1);

        // Clear Sensor Sample Period 
        this.dt = 0;

        // Clear Data History Windows 
        this.accWindow.clear();
        this.gyroWindow.clear();

        // Clear Global Vars
        // ZEMU
        ZEMU_Z_LP.splice(0,ZEMU_Z_LP.length);

        // SDUP
        STEP_ARRAY.splice(0, STEP_ARRAY.length);
        SDUP_Z_LP.splice(0, SDUP_Z_LP.length);
        SDUP_STEP_DETECTED = false;
        SDUP_ZERO_CROSS = false;
        STEP_COUNTER = 0;
        SDUP_TIMEOUT = 0;

        // URU
        URU_G_LP.splice(0,URU_G_LP.length);
        URU_GYRO_SUM = 0;
        URU_RESET = true;
        URU_INIT_STAND = true;
        URU_TURN_BUFFER.splice(0, URU_TURN_BUFFER.length);
        URU_IN_TURN = false;
        URU_TIMEOUT = 0;

        // DEBBUG
        this.POSITION_HISTORY.clear();
    }

    // 3x3 Skew Symmetric matrix
   static skewSymmetric(v) {
        return math.matrix([[0, -v[2], v[1]],
        [v[2], 0, -v[0]],
        [-v[1], v[0], 0]]);
    }

    // Quaternion Multiplication Helper Function
   static quaternionMulti(q1, q2) {
        // q1 = [w1, x1, y1, z1], q2 = [w2, x2, y2, z2]

        return [q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2] - q1[3] * q2[3],
        q1[0] * q2[1] + q1[1] * q2[0] + q1[2] * q2[3] - q1[3] * q2[2],
        q1[0] * q2[2] - q1[1] * q2[3] + q1[2] * q2[0] + q1[3] * q2[1],
        q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1] + q1[3] * q2[0]];

    }

   static quaternion2rpy(q) {
        // q = [qw, qx, qy, qz]

        // roll
        let nr = 2 * (q[0] * q[1] + q[2] * q[3]);
        let dr = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
        let r = math.atan2(nr, dr);

        // pitch
        let np = math.sqrt(1 + 2 * (q[0] * q[2] - q[1] * q[3]));
        let dp = math.sqrt(1 - 2 * (q[0] * q[2] - q[1] * q[3]));
        let p = 2 * math.atan2(np, dp) - math.pi/2;

        //yaw 
        let ny = 2 * (q[0] * q[3] + q[1] * q[2]);
        let dy = 1 - 2 * (q[2] * q[2] + q[3] * q[3]);
        let y = math.atan2(ny, dy);

        return [r, p, y]
    }

    // Utility function that transforms a given quaternion q to a Rotation Matrix R
   static quaternion2matrix(q) {
        // q = [w, x, y, z]
        return math.matrix([[1 - 2 * (q[2] * q[2] + q[3] * q[3]), 2 * (q[1] * q[2] - q[0] * q[3]), 2 * (q[1] * q[3] + q[0] * q[2])],
        [2 * (q[1] * q[2] + q[0] * q[3]), 1 - 2 * (q[1] * q[1] + q[3] * q[3]), 2 * (q[2] * q[3] - q[0] * q[1])],
        [2 * (q[1] * q[3] - q[0] * q[2]), 2 * (q[2] * q[3] + q[0] * q[1]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])]]);
    }

    // Utility Function that transforms given rpy angles to its corresponding quaternion
   static rpy2quaternion(r, p, y) {

        let qw = math.cos(r / 2) * math.cos(p / 2) * math.cos(y / 2) + math.sin(r / 2) * math.sin(p / 2) * math.sin(y / 2);
        let qx = math.sin(r / 2) * math.cos(p / 2) * math.cos(y / 2) - math.cos(r / 2) * math.sin(p / 2) * math.sin(y / 2);
        let qy = math.cos(r / 2) * math.sin(p / 2) * math.cos(y / 2) + math.sin(r / 2) * math.cos(p / 2) * math.sin(y / 2);
        let qz = math.cos(r / 2) * math.cos(p / 2) * math.sin(y / 2) - math.sin(r / 2) * math.sin(p / 2) * math.cos(y / 2);
        
        return [qw, qx, qy, qz];
    }

    // Utility Function that calculates Quaternion based on Gyro Readings
    quaternionFromGyro(gyroscopeDataObj) {
        let omega = [gyroscopeDataObj.x, gyroscopeDataObj.y, gyroscopeDataObj.z];
        let theta = math.norm(omega) * this.dt;

        let dw = (math.norm(omega) == 0) ? [0, 0, 0] : omega.map((v) => v / math.norm(omega));
        let dq = [math.cos(theta / 2), dw[0] * math.sin(theta / 2), dw[1] * math.sin(theta / 2), dw[2] * math.sin(theta / 2)];

        return dq;
    }

    // Calculate the change of the quaternion attitude  from gyroscope data
    qNextFromGyro(gyroscopeDataObj, q_prev) {
        let omega = [gyroscopeDataObj.x, gyroscopeDataObj.y, gyroscopeDataObj.z];

        let skewW = PedestrianDeadReckoning.skewSymmetric(omega);
        omega = math.transpose([omega]);

        let wt = math.multiply(-1, math.transpose(omega));

        let O1 = math.concat([[0]], wt);
        let O2 = math.concat(omega, skewW);

        let OMEGA = math.concat(O1, O2, 0);

        // First Order Taylor Series 
        let first = math.multiply(0.5, OMEGA, this.dt);
        let q_next = math.multiply(math.add(math.identity(4), first), math.transpose([q_prev]));
        
        q_next = [q_next.get([0,0]), q_next.get([1,0]), q_next.get([2,0]), q_next.get([3,0])];
        let qN_next = q_next.map((v) => v / math.norm(q_next));

        return qN_next;
    }

    // Pass the Data to the correspondig Windows
    prepData(accelerometerDataObj, gyroscopeDataObj) {

        // Data Window length check
        let lenAcc = this.accWindow.length();
        let lenGyro = this.gyroWindow.length();

        let lenCheck = (lenAcc === lenGyro)

        if (lenCheck) {
            // PUSH NEW DATA TO HISTORY ARRAYS 
            if (lenAcc < WINDOW) {
                this.accWindow.push(accelerometerDataObj);
                this.gyroWindow.push(gyroscopeDataObj);

                SDUP_Z_LP.push(0);
                ZEMU_Z_LP.push(0);
                URU_G_LP.push(0);

            } else {
                this.accWindow.pushAndShift(accelerometerDataObj);
                this.gyroWindow.pushAndShift(gyroscopeDataObj);

                // PASS Z ACCELERATION THROUGH A LOW-PASS FILTER
                let zLowPass = (math.sum(this.accWindow.data.z.slice(-SDUP_N))) / SDUP_N;
                SDUP_Z_LP.push(zLowPass);
                ZEMU_Z_LP.push(zLowPass);
                ZEMU_Z_LP.shift();

                // PASS Z-GYROSCOPE DATA THROUGH A LOW-PASS FILTER
                let gLowPass = (math.sum(this.gyroWindow.data.z.slice(-URU_N))) / URU_N;
                URU_G_LP.push(gLowPass);
            }

        } else {
            throw new Error('prepDataHistory: Missmatched Data Window Lengths!');
        }
    }

    // State Prediction Function   
    predict(accelerometerDataObj) {
        this.RotationMatrix = PedestrianDeadReckoning.quaternion2matrix(this.attitude);
        let acc = [accelerometerDataObj.x, accelerometerDataObj.y, accelerometerDataObj.z];

        // Predict dp, dv, da 
        // position Error, velocity Error, heading Error
        this.da = math.multiply(-this.dt, math.multiply(this.RotationMatrix, this.gyroBias));
        this.dv = math.add(math.multiply(this.dt, PedestrianDeadReckoning.skewSymmetric(acc), this.da), math.multiply(this.dt, this.RotationMatrix, this.accBias));
        //this.dp = math.multiply(this.dt, this.dv);
    }

    // Judgement Function that recognizes user state from collected Data
    /*  Four Judgement submodules 
        ZEMU    -   ZEro Movement Update
        ZARU    -   Zero Angular Rate Update
        URU     -   User Rotation Update
        SDUP    -   Step Detection and Update
    */

    /* ZERO MOVEMENT UPDATE 
        This judgement module recognizes whether the user is in a relative stable state.
        
        This means that if the user is standing still, the accelerometer readings should be 
        close to zero. 
    */
    ZEMU() {
        // Make Shallow Copy of DataHistory Objects
        let accW = JSON.parse(JSON.stringify(this.accWindow));

        // While Standing still, calculate Mean acceleration as Bias
        let accBiasX = math.mean(accW.data.x);
        let accBiasY = math.mean(accW.data.y);
        let accBiasZ = math.mean(accW.data.z);

        //Var Z
        let varAZ = ZEMU_Z_LP.length < WINDOW ?  0 : math.variance(ZEMU_Z_LP);

        let accFlag = varAZ < ZEMU_VAR_ACC_THRESH;
        if (accFlag) {
            this.accBias.set([0,0], math.mean(this.accBias.get([0,0]), accBiasX));
            this.accBias.set([1,0], math.mean(this.accBias.get([1,0]), accBiasY));
            this.accBias.set([2,0], math.mean(this.accBias.get([2,0]), accBiasZ));

            //this.dv = math.add(this.velocity, math.multiply(this.RotationMatrix, this.accBias, this.dt));

            this.dv = this.velocity;

            this.lastStepVel = math.zeros(3, 1);
            //this.gyroBias = math.zeros(3, 1);

            return true;
        } else {
            return false;
        }
    }

    /*  ZERO ANGULAR RATE UPDATE  
        This judgement module is responsible to calculate the gyro bias and correct the user heading
        
        The logic behind this module, is that we assume that a user can only walk in straight paths,
        thus we controll the mean readings of the gyroscopee as Bias while useer is walking.
    */
    ZARU() {
        let gyroW = JSON.parse(JSON.stringify(this.gyroWindow));

        let gyroBiasX = math.mean(gyroW.data.x);
        let gyroBiasY = math.mean(gyroW.data.y);
        let gyroBiasZ = math.mean(gyroW.data.z);

        this.gyroBias.set([0,0], math.mean(this.gyroBias.get([0,0]), gyroBiasX));
        this.gyroBias.set([1,0], math.mean(this.gyroBias.get([1,0]), gyroBiasY));
        this.gyroBias.set([2,0], math.mean(this.gyroBias.get([2,0]), gyroBiasZ));

        let lastStep_rpy = PedestrianDeadReckoning.quaternion2rpy(this.lastStepAtt);
        let curr_rpy = PedestrianDeadReckoning.quaternion2rpy(this.attitude);

        // TO FIX! KEEPS EVERYTHING IN A STRAIGHT LINE 
        this.da = math.matrix(math.subtract(math.transpose([lastStep_rpy]), math.transpose([curr_rpy])));

        //this.da = math.add(this.da, math.multiply(-this.dt, math.multiply(this.RotationMatrix, this.gyroBias)));
    }

    /* STEP DETECTION AND UPDATE  
        This judgement module detects step events and calculates their length and velocity
    */
    SDUP() {
        const K = 0.5762;;
        for (let i = 0; i < SDUP_Z_LP.length - 1; i++) {
            if (SDUP_Z_LP[i] > SDUP_ACC_THRESHOLD && !SDUP_STEP_DETECTED) {
                SDUP_STEP_DETECTED = true;
                SDUP_TIMEOUT = 0;

                SDUP_MAX = -100;
                SDUP_MIN = 100;
            }

            if (SDUP_STEP_DETECTED) {
                SDUP_TIMEOUT += this.dt;
                SDUP_MAX = math.max(SDUP_MAX, SDUP_Z_LP[i]);
                SDUP_MIN = math.min(SDUP_MIN, SDUP_Z_LP[i]);

                if (SDUP_Z_LP[i] > 0 && SDUP_Z_LP[i + 1] < 0) {
                    SDUP_ZERO_CROSS = true;
                }

                if ((SDUP_Z_LP[i + 1] > 0 && SDUP_ZERO_CROSS) || SDUP_TIMEOUT > SDUP_MAX_TIME) {
                    SDUP_STEP_DETECTED = false;
                    SDUP_ZERO_CROSS = false;

                    // if (SDUP_MAX + math.abs(SDUP_MIN) > 4.5) {
                    //     K = 0.7;
                    // } else {
                    //     K = 0.5762;
                    // }

                    //K = 0.579;

                    STEP_COUNTER++;
                    STEP_ARRAY[STEP_COUNTER - 1] = K * math.nthRoot(SDUP_MAX + math.abs(SDUP_MIN), 4);
                    this.lastStepVel.set([1, 0], STEP_ARRAY[STEP_COUNTER - 1] / SDUP_TIMEOUT);
                    SDUP_Z_LP.splice(0, i);
                    //console.log(`STEP_ARRAY = ${STEP_ARRAY}`);
                    //console.log(`nr of steps: ${STEP_COUNTER}   \t len = ${math.sum(STEP_ARRAY)}`);

                    // Update State Error Variables
                    this.position = math.add(this.lastStepPos, math.multiply(this.lastStepRot, math.matrix([[0], [STEP_ARRAY[STEP_COUNTER - 1]], [0]])));
                    //this.dv = math.subtract(this.velocity, math.multiply(this.lastStepRot, this.lastStepVel));
            
                    let velArr = [this.velocity.get([0,0]), this.velocity.get([1,0]), this.velocity.get([2,0])];
                    this.dv = math.subtract(math.multiply(this.lastStepRot, this.velocity), math.multiply(this.lastStepRot, PedestrianDeadReckoning.skewSymmetric(velArr), this.da));
                    return true;
                }
            }
        }
        SDUP_STEP_DETECTED = false;
        SDUP_ZERO_CROSS = false;

        this.dv = SDUP_TIMEOUT < 0.6 ? math.subtract(this.velocity, math.multiply(this.lastStepRot, this.lastStepVel)) : this.velocity;

        return false;
    }

        /*  USER ROTATION UPDATE 
        This judgement module is responsible for detecting significant rotations assuming that the user can only rotate during standing phases.
        . This module is enabled while ZEMU returns false 
    */
    URU() {
        let turnFlag = math.variance(URU_G_LP.slice(-WINDOW)) > URU_VAR_THRESH;

        // If turning, store gyroscope Data
        if(turnFlag) {
            URU_IN_TURN = true;
            URU_TIMEOUT += this.dt;
            URU_TURN_BUFFER.push(URU_G_LP[URU_G_LP.length-1]);
        }

        // If a valid turn ends then calculate the angle 
        if(!turnFlag && URU_IN_TURN && URU_TIMEOUT >= 0.7) {
            URU_IN_TURN = false;
            let m = math.mean(URU_TURN_BUFFER);
            let p = URU_TURN_BUFFER.find((value) => {
                return (math.abs(value) === math.max(math.abs(URU_TURN_BUFFER)));
            });

            let theta = (math.mean(m, p) * URU_TIMEOUT) * 180/math.pi;
            //console.log(`theta = ${theta}`);

            let d = 360;
            let angle = 0;

            for(let i=0; i<URU_ANGLES.length; i++) {
                if (math.abs(URU_ANGLES[i] - theta) < d) {
                    d = math.abs(URU_ANGLES[i] - theta);
                    angle = URU_ANGLES[i];
                }
            }
            URU_DELTA = angle;
            this.lastStepAtt = PedestrianDeadReckoning.rpy2quaternion(0 , 0, PedestrianDeadReckoning.quaternion2rpy(this.lastStepAtt)[2] + angle * (math.pi/180));
            this.lastStepRot = PedestrianDeadReckoning.quaternion2matrix(this.lastStepAtt);
            URU_TURN_BUFFER.splice(0, URU_TURN_BUFFER.length);
            URU_TIMEOUT = 0;
            return true;
        }

        // If a turn is insignifically small, then ignore it and reset
        if(!turnFlag && URU_IN_TURN && URU_TIMEOUT < 0.3) {
            URU_TIMEOUT = 0;
            URU_IN_TURN = false;
            URU_TURN_BUFFER.splice(0, URU_TURN_BUFFER.length);
        }
        
        URU_DELTA = 0;
        return false;
    }

    judge(accelerometerDataObj, gyroscopeDataObj) {
        // Prepare Data for modules
        this.prepData(accelerometerDataObj, gyroscopeDataObj);

        // Flag object to pass on update 
        let judgeFlagObj = {
            zemu: false,
            sdup: false,
            uru:  false,
        };

        // ZERO MOVEMENT UPDATE 
        judgeFlagObj.zemu = this.ZEMU();

        // IF USER IS WALKING, CHECK FOR STEPS 
        if (!judgeFlagObj.zemu) {
            // WE ASSUME THAT A USER CAN ONLY WALK IN STRAIGHT LINES 
            this.ZARU();
            // STEP DETECTION AND LENGTH/VELOCITY EXTRACTION 
            judgeFlagObj.sdup = this.SDUP();
        }
        // USER ROTATION UPDATE
        judgeFlagObj.uru = this.URU();

        return judgeFlagObj;
    }

    // State Update Function
    update(accelerometerDataObj, gyroscopeDataObj, judgeFlagsObj) {

        let accData = [accelerometerDataObj.x, accelerometerDataObj.y, accelerometerDataObj.z];

        // WE TAKE THE ROTATION MATRIX GIVEN FROM THE ATTITUDE ESTIMATION KALMAN FILTER 

        // Update State Variables 
        // Attitude
        
        //let varQ = PedestrianDeadReckoning.rpy2quaternion(gyroscopeDataObj.x * this.dt, gyroscopeDataObj.y * this.dt, gyroscopeDataObj.z * this.dt);
        
        // let varQ = this.quaternionFromGyro(gyroscopeDataObj);
        // this.attitude = PedestrianDeadReckoning.quaternionMulti(varQ, this.attitude);
        this.attitude = this.qNextFromGyro(gyroscopeDataObj, this.attitude);
        
        let errorQ = PedestrianDeadReckoning.rpy2quaternion(this.da.get([0, 0]), this.da.get([1, 0]), this.da.get([2, 0]));

        //let errorQ = PedestrianDeadReckoning.rpy2quaternion(0,0,this.da.get([2,0]));
        this.attitude = PedestrianDeadReckoning.quaternionMulti(this.attitude, errorQ);

        // Update Rotations
        this.RotationMatrix = PedestrianDeadReckoning.quaternion2matrix(this.attitude);

        // Velocity
        this.velocity = math.add(this.velocity, math.multiply(this.RotationMatrix, math.transpose([accData]), this.dt));
        this.velocity = math.subtract(this.velocity, this.dv);

        // Position 
        //this.position = math.add(this.position, math.multiply(this.velocity, this.dt));
        //this.position = math.subtract(this.position, this.dp);

        // console.log(`this.position = ${this.position}`);
        // console.log(`this.velocity = ${this.velocity}`);

        // Satisfied modules 
        // Flags = [zemu, sdup];
        if (judgeFlagsObj.sdup) {
            this.lastStepPos = this.position;
            this.POSITION_HISTORY.push({
                x: this.position.get([0, 0]),
                y: this.position.get([1, 0]),
                z: this.position.get([2, 0])
            });
        }

    }

    // The Extended Kalman Filter "main" function
    runEKF(accelerometerDataObj, gyroscopeDataObj) {

        // Predict the State Error values
        this.predict(accelerometerDataObj);
        // For each sensor input, judge the state of User and return the modules that are satisfied
        let judgeFlagsObj = this.judge(accelerometerDataObj, gyroscopeDataObj);
        // After Judgement
        this.update(accelerometerDataObj, gyroscopeDataObj, judgeFlagsObj);

        return {
            newStep: judgeFlagsObj.sdup,
            newTurn: judgeFlagsObj.uru,
            stepLength: judgeFlagsObj.sdup? STEP_ARRAY.at(-1) : 0,
            deltaTh : URU_DELTA,
        }
    }

    // ======== USER INPUT FUNCTIONS ========
    // ADD STEP
    utilAddStep() {
        STEP_COUNTER ++;
        console.log(`STEP COUNTER  =\t ${STEP_COUNTER}`)
        if (STEP_COUNTER > 1) {
            STEP_ARRAY[STEP_COUNTER - 1] = math.mean(...STEP_ARRAY);
        } else {
            STEP_ARRAY[STEP_COUNTER - 1] = 0.7;
        }

        this.position = math.add(this.lastStepPos, math.multiply(this.lastStepRot, math.matrix([[0], [STEP_ARRAY[STEP_COUNTER - 1]], [0]])));
        
        this.lastStepPos = this.position;
            this.POSITION_HISTORY.push({
                x: this.position.get([0, 0]),
                y: this.position.get([1, 0]),
                z: this.position.get([2, 0])
            });
    }
    // REMOVE STEP
    utilRemoveStep() {
        STEP_COUNTER --;
        if(STEP_COUNTER <= 0) {
            STEP_ARRAY.splice(0, STEP_ARRAY.length);
            STEP_COUNTER = 0;
            this.POSITION_HISTORY.set({x: 0, y:0, z:0});
            this.position.set([0,0], 0);
            this.position.set([1,0], 0);
            this.position.set([2,0], 0);
            this.lastStepPos = this.position;
            return;
        } else {
            this.POSITION_HISTORY.pop();
            this.position.set([0,0], this.POSITION_HISTORY.getLast().x);
            this.position.set([1,0], this.POSITION_HISTORY.getLast().y);
            this.position.set([2,0], this.POSITION_HISTORY.getLast().z);
            this.lastStepPos = this.position;
            STEP_ARRAY.pop();
        }
    }
    // TURN LEFT
    utilTurnLeft() {
        this.lastStepAtt = PedestrianDeadReckoning.rpy2quaternion(0 , 0, PedestrianDeadReckoning.quaternion2rpy(this.lastStepAtt)[2] + 45 * (math.pi/180));
        this.lastStepRot = PedestrianDeadReckoning.quaternion2matrix(this.lastStepAtt);
    }
    // TURN RIGHT
    utilTurnRight() {
        this.lastStepAtt = PedestrianDeadReckoning.rpy2quaternion(0 , 0, PedestrianDeadReckoning.quaternion2rpy(this.lastStepAtt)[2] - 45 * (math.pi/180));
        this.lastStepRot = PedestrianDeadReckoning.quaternion2matrix(this.lastStepAtt);
    }
}