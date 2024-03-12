// FIND THE "TO FIX COMMENTS"

import * as math from "mathjs";


// DEBBUG
let DEBUG_1 = 0;
//==============================================================================================================//
// Constants 
const WINDOW = 25;
//==============================================================================================================//
// ZUPT CONSTANTS
const ZUPT_VAR_ACC_THRESH = 0.25;
//==============================================================================================================//
// SDUP CONSTANTS AND VARIABLES
const SDUP_ACC_THRESHOLD = 0.7;                 // Acceleration Threshold to surpass in order to detect a step
const SDUP_MAX_TIME = 0.85;                     // Maximum Step Time Threshold
const SDUP_N = 6;                               // Low Pass Filter 'Order' 
const STEP_ARRAY = [];                          // Step Length Array
const SDUP_Z_LP = [];                           // Low-Pass Z acceleration

let STEP_COUNTER = 0;
let SDUP_STEP_DETECTED = false;
let SDUP_ZERO_CROSS = false;
let SDUP_MAX = -100;
let SDUP_MIN = 100;
let SDUP_TIMEOUT = 0;
//==============================================================================================================//
// URU CONSTANTS AND VARIABLES
const URU_N = 6;
const URU_G_LP = [];
const URU_ANGLE_THRESH = 11.5 * (math.pi / 180);                    // ANGLE CHANGE THRESHOLD

let URU_RESET = true;
let URU_INIT_STAND = true;
let URU_GYRO_SUM = 0;

// //////////////////////////////////////////////////////////////
const URU_TURN_BUFFER = [];
const URU_ANGLES = [-90, -45, 0, 45, 90];
const URU_VAR_THRESH = 0.01;


let URU_IN_TURN = false;
let URU_TIMEOUT = 0;
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
            this.data = dataObject;
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

export class nav3 {
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
        this.magWindow = new DataHistory();

        // Rotated Data History Windows 
        this.rotAccWindow = new DataHistory();
        this.rotGyroWindow = new DataHistory();
        this.rotMagWindow = new DataHistory();

        // DEBUG
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
        this.magWindow.clear();

        // Clear Rotated Data History Windows 
        this.rotAccWindow.clear();
        this.rotGyroWindow.clear();
        this.rotMagWindow.clear();

        // Clear Global Vars

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
        URU_BIAS = 0;

        URU_RESET = true;
        URU_INIT_STAND = true;

        // DEBBUG
        DEBUG_1 = 0;
        this.POSITION_HISTORY.clear();
    }

    // 3x3 Skew Symmetric matrix
    skewSymmetric(v) {
        return math.matrix([[0, -v[2], v[1]],
        [v[2], 0, -v[0]],
        [-v[1], v[0], 0]]);
    }

    // Quaternion Multiplication Helper Function
    quaternionMulti(q1, q2) {
        // q1 = [w1, x1, y1, z1], q2 = [w2, x2, y2, z2]

        return [q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2] - q1[3] * q2[3],
        q1[0] * q2[1] + q1[1] * q2[0] + q1[2] * q2[3] - q1[3] * q2[2],
        q1[0] * q2[2] - q1[1] * q2[3] + q1[2] * q2[0] + q1[3] * q2[1],
        q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1] + q1[3] * q2[0]];

    }

    quaternion2rpy(q) {
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
    quaternion2matrix(q) {
        // q = [w, x, y, z]
        return math.matrix([[1 - 2 * (q[2] * q[2] + q[3] * q[3]), 2 * (q[1] * q[2] - q[0] * q[3]), 2 * (q[1] * q[3] + q[0] * q[2])],
        [2 * (q[1] * q[2] + q[0] * q[3]), 1 - 2 * (q[1] * q[1] + q[3] * q[3]), 2 * (q[2] * q[3] - q[0] * q[1])],
        [2 * (q[1] * q[3] - q[0] * q[2]), 2 * (q[2] * q[3] + q[0] * q[1]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])]]);
    }

    // Utility Function that transforms given rpy angles to its corresponding quaternion
    rpy2quaternion(r, p, y) {

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

        let skewW = this.skewSymmetric(omega);
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


    // State Prediction Function   
    predict(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj) {
        this.RotationMatrix = this.quaternion2matrix(this.attitude);
        let acc = [accelerometerDataObj.x, accelerometerDataObj.y, accelerometerDataObj.z];

        // Predict dp, dv, da 
        // position Error, velocity Error, heading Error
        this.da = math.multiply(-this.dt, math.multiply(this.RotationMatrix, this.gyroBias));
        this.dv = math.add(math.multiply(this.dt, this.skewSymmetric(acc), this.da), math.multiply(this.dt, this.RotationMatrix, this.accBias));
        this.dp = math.multiply(this.dt, this.dv);
    }

    // Judgement Function that recognizes user state from collected Data
    /*  Four Judgement submodules 
        ZEMU    -   ZEro Movement Update
        ZARU    -   Zero Angular Rate Update
        URU     -   User Rotation Update
        SDUP    -   Step Detection and Update
        IPER    -   Investigative Position Error Reduction
        IHER    -   Investigative Heading Error Reduction (?)
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
        accW.data.z.length < WINDOW ? varAZ = 0 : varAZ = math.variance(accW.data.z);

        let accFlag = varAZ < ZUPT_VAR_ACC_THRESH;
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

        let lastStep_rpy = this.quaternion2rpy(this.lastStepAtt);
        let curr_rpy = this.quaternion2rpy(this.attitude);

        // TO FIX! KEEPS EVERYTHING IN A STRAIGHT LINE 
        this.da = math.matrix(math.subtract(math.transpose([lastStep_rpy]), math.transpose([curr_rpy])));

        //this.da = math.add(this.da, math.multiply(-this.dt, math.multiply(this.RotationMatrix, this.gyroBias)));
    }

    /*  USER ROTATION UPDATE 
        This judgement module is responsible for detecting significant rotations assuming that the user can only rotate during standing phases.
        . This module is enabled while ZEMU returns false 
    */
    URU(walkingFlag) {
        
        let gyroW = JSON.parse(JSON.stringify(this.gyroWindow));
        let magW = JSON.parse(JSON.stringify(this.magWindow));

        if(walkingFlag) {
            // URU_BIAS = math.mean(URU_BIAS, math.mean(URU_G_LP.slice(URU_G_LP.length - WINDOW)));
            // URU_BIAS = math.mean(URU_BIAS, ...URU_G_LP.slice(URU_G_LP.length - WINDOW));
            URU_INIT_STAND = false;
            if (!URU_RESET) {
                URU_RESET = true;
                console.log(`\n====================================================================================================`);
                console.log(`\n\nURU ROTATION = ${URU_GYRO_SUM * (180/math.pi)}`);
                URU_GYRO_SUM = math.abs(URU_GYRO_SUM) < URU_ANGLE_THRESH ? 0 : URU_GYRO_SUM;
                URU_GYRO_SUM = math.abs(URU_GYRO_SUM - math.sign(URU_GYRO_SUM) * math.pi/2) < URU_ANGLE_THRESH ? math.sign(URU_GYRO_SUM) * math.pi/2 : URU_GYRO_SUM;
                URU_GYRO_SUM = math.abs(URU_GYRO_SUM) > math.pi/2 ? math.sign(URU_GYRO_SUM) * math.pi/2 : URU_GYRO_SUM;
                
                console.log(`\n\nURU ROTATION update = ${(URU_GYRO_SUM + this.quaternion2rpy(this.lastStepAtt)[2]) * (180/math.pi)}`);

                this.lastStepAtt = this.rpy2quaternion(0 , 0, this.quaternion2rpy(this.lastStepAtt)[2] + URU_GYRO_SUM);
                this.lastStepRot = this.quaternion2matrix(this.lastStepAtt);
               
               
                console.log(`LAST STEP ATTITUDE YAW= ${this.quaternion2rpy(this.lastStepAtt)[2] * 180/math.pi}`);
                console.log(`\n\n====================================================================================================`);

                URU_GYRO_SUM = 0;
            }

        }

        if(!walkingFlag && !URU_INIT_STAND) {
            URU_GYRO_SUM = (math.variance(this.gyroWindow.data.z) > 0.125) ? URU_GYRO_SUM + URU_G_LP[URU_G_LP.length-1] * this.dt : URU_GYRO_SUM;
            URU_RESET = false;
        }
    }

    URU_V2() {
        let varSq = URU_G_LP.map((v) => v*v).slice(-WINDOW);
        let turnFlag = math.variance(varSq) > URU_VAR_THRESH;

        if(turnFlag) {
            URU_IN_TURN = true;
            URU_TIMEOUT += this.dt;
            URU_TURN_BUFFER.push(URU_G_LP.slice(-1));
        }

        if(!turnFlag && URU_IN_TURN && URU_TIMEOUT >= 0.6) {
            URU_IN_TURN = false;
            let m = math.mean(...URU_TURN_BUFFER) * URU_TIMEOUT;
            
            let peak = URU_TURN_BUFFER.find((value) => {
                if (math.abs(value) == math.max(math.abs(URU_TURN_BUFFER))) {return value}
            });

            let theta = math.mean(m, peak) * 180/math.pi;
            let d = 360;
            let angle = 0;
            for(let i=0; i<URU_ANGLES.length; i++) {
                if (math.abs(URU_ANGLES[i] - theta) < d) {
                    d = abs(URU_ANGLES[i] - theta);
                    angle = URU_ANGLES[i];
                }
            }
            
            this.lastStepAtt = this.rpy2quaternion(0 , 0, this.quaternion2rpy(this.lastStepAtt)[2] + angle);
            this.lastStepRot = this.quaternion2matrix(this.lastStepAtt);

            URU_TURN_BUFFER.splice(0, URU_TURN_BUFFER.length);
            URU_TIMEOUT = 0;
        }

        if(!turnFlag && URU_IN_TURN && URU_TIMEOUT < 0.3) {
            URU_TIMEOUT = 0;
            URU_IN_TURN = false;
            URU_TURN_BUFFER.splice(0, URU_TURN_BUFFER.length);
        }
       
    }

    /* STEP DETECTION AND UPDATE  
        This judgement module detects step events and calculates their length and velocity
    */
    SDUP() {
        let K = 0;
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

                    if (SDUP_MAX + math.abs(SDUP_MIN) > 4.5) {
                        K = 0.7;
                    } else {
                        K = 0.579;
                    }

                    //K = 0.579;

                    STEP_COUNTER++;
                    STEP_ARRAY[STEP_COUNTER - 1] = K * math.nthRoot(SDUP_MAX + math.abs(SDUP_MIN), 4);
                    this.lastStepVel.set([1, 0], STEP_ARRAY[STEP_COUNTER - 1] / SDUP_TIMEOUT);
                    SDUP_Z_LP.splice(0, i);
                    //console.log(`STEP_ARRAY = ${STEP_ARRAY}`);
                    console.log(`nr of steps: ${STEP_COUNTER}   \t len = ${math.sum(STEP_ARRAY)}`);

                    // Update State Error Variables
                    this.dp = math.subtract(this.position, math.add(this.lastStepPos, math.multiply(this.lastStepRot, math.matrix([[0], [STEP_ARRAY[STEP_COUNTER - 1]], [0]]))));
                    //this.dv = math.subtract(this.velocity, math.multiply(this.lastStepRot, this.lastStepVel));
            

                    let velArr = [this.velocity.get([0,0]), this.velocity.get([1,0]), this.velocity.get([2,0])];
                    this.dv = math.subtract(math.multiply(this.lastStepRot, this.velocity), math.multiply(this.lastStepRot, this.skewSymmetric(velArr), this.da));
                    return true;
                }
            }
        }
        SDUP_STEP_DETECTED = false;
        SDUP_ZERO_CROSS = false;

        this.dv = SDUP_TIMEOUT < 0.6 ? math.subtract(this.velocity, math.multiply(this.lastStepRot, this.lastStepVel)) : this.velocity;

        return false;
    }

    // Pass the Data to the correspondig Windows

    prepDataHistory(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj) {
        // Rotate Data
        let acc = math.matrix([[accelerometerDataObj.x], [accelerometerDataObj.y], [accelerometerDataObj.z]]);
        let gyro = math.matrix([[gyroscopeDataObj.x], [gyroscopeDataObj.y], [gyroscopeDataObj.z]]);
        let mag = math.matrix([[magnetometerDataObj.x], [magnetometerDataObj.y], [magnetometerDataObj.z]]);

        let rotAccObj = {
            x: math.multiply(this.RotationMatrix, acc).get([0, 0]),
            y: math.multiply(this.RotationMatrix, acc).get([1, 0]),
            z: math.multiply(this.RotationMatrix, acc).get([2, 0])
        };

        let rotGyroObj = {
            x: math.multiply(this.RotationMatrix, gyro).get([0, 0]),
            y: math.multiply(this.RotationMatrix, gyro).get([1, 0]),
            z: math.multiply(this.RotationMatrix, gyro).get([2, 0])
        };

        let rotMagObj = {
            x: math.multiply(this.RotationMatrix, mag).get([0, 0]),
            y: math.multiply(this.RotationMatrix, mag).get([1, 0]),
            z: math.multiply(this.RotationMatrix, mag).get([2, 0])
        };

        // Data Window length check
        let lenAcc = this.accWindow.length();
        let lenGyro = this.gyroWindow.length();
        let lenMag = this.magWindow.length();

        let lenRotAcc = this.rotAccWindow.length();
        let lenRotGyro = this.rotGyroWindow.length();
        let lenRotMag = this.rotMagWindow.length();

        let lenCheck = (lenAcc === lenRotAcc) && (lenGyro === lenRotGyro)
            && (lenMag === lenRotMag) && (lenAcc === lenGyro)
            && (lenRotAcc === lenRotMag);

        if (lenCheck) {
            // PUSH NEW DATA TO HISTORY ARRAYS 
            if (lenAcc < WINDOW) {
                this.accWindow.push(accelerometerDataObj);
                this.gyroWindow.push(gyroscopeDataObj);
                this.magWindow.push(magnetometerDataObj);

                this.rotAccWindow.push(rotAccObj);
                this.rotGyroWindow.push(rotGyroObj);
                this.rotMagWindow.push(rotMagObj);

                SDUP_Z_LP.push(0);
                URU_G_LP.push(0);

            } else {
                this.accWindow.pushAndShift(accelerometerDataObj);
                this.gyroWindow.pushAndShift(gyroscopeDataObj);
                this.magWindow.pushAndShift(magnetometerDataObj);

                this.rotAccWindow.pushAndShift(rotAccObj);
                this.rotGyroWindow.pushAndShift(rotGyroObj);
                this.rotMagWindow.pushAndShift(rotMagObj);

                // PASS Z ACCELERATION THROUGH A LOW-PASS FILTER
                let zLowPass = (math.sum(this.accWindow.data.z.slice(lenAcc - SDUP_N))) / SDUP_N;
                SDUP_Z_LP.push(zLowPass);

                // PASS Z-GYROSCOPE DATA THROUGH A LOW-PASS FILTER
                let gLowPass = (math.sum(this.gyroWindow.data.z.slice(lenGyro - URU_N))) / URU_N;
                URU_G_LP.push(gLowPass);
            }

            DEBUG_1++;

        } else {
            throw new Error('prepDataHistory: Missmatched Data Window Lengths!');
        }
    }

    judge(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj) {
        // SAVE DATA HISTORY WINDOWS
        this.prepDataHistory(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj);

        // Flag object to pass on update 
        let judgeFlagObj = {
            zemu: false,
            sdup: false,
        };

        // ZERO VELOCITY UPDATE 
        judgeFlagObj.zemu = this.ZEMU();
       
        // USER ROTATION UPDATE
        this.URU(!judgeFlagObj.zemu);

        // IF USER IS WALKING, CHECK FOR STEPS 
        if (!judgeFlagObj.zemu) {

            // WE ASSUME THAT A USER CAN ONLY WALK IN STRAIGHT LINES 
            this.ZARU();
            // STEP DETECTION AND LENGTH/VELOCITY EXTRACTION 
            judgeFlagObj.sdup = this.SDUP();

        }

        return judgeFlagObj;
    }

    // State Update Function
    update(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj, judgeFlagsObj) {

        let accData = [accelerometerDataObj.x, accelerometerDataObj.y, accelerometerDataObj.z];

        // WE TAKE THE ROTATION MATRIX GIVEN FROM THE ATTITUDE ESTIMATION KALMAN FILTER 

        // Update State Variables 
        // Attitude
        
        //let varQ = this.rpy2quaternion(gyroscopeDataObj.x * this.dt, gyroscopeDataObj.y * this.dt, gyroscopeDataObj.z * this.dt);
        
        // let varQ = this.quaternionFromGyro(gyroscopeDataObj);
        // this.attitude = this.quaternionMulti(varQ, this.attitude);
        this.attitude = this.qNextFromGyro(gyroscopeDataObj, this.attitude);
        
        let errorQ = this.rpy2quaternion(this.da.get([0, 0]), this.da.get([1, 0]), this.da.get([2, 0]));

        //let errorQ = this.rpy2quaternion(0,0,this.da.get([2,0]));
        this.attitude = this.quaternionMulti(this.attitude, errorQ);

        // Update Rotations
        this.RotationMatrix = this.quaternion2matrix(this.attitude);

        // Velocity
        this.velocity = math.add(this.velocity, math.multiply(this.RotationMatrix, math.transpose([accData]), this.dt));
        this.velocity = math.subtract(this.velocity, this.dv);

        // Position 
        this.position = math.add(this.position, math.multiply(this.velocity, this.dt));
        this.position = math.subtract(this.position, this.dp);

        // console.log(`this.position = ${this.position}`);
        // console.log(`this.velocity = ${this.velocity}`);

        // Satisfied modules 
        // Flags = [zemu, sdup];
        if (judgeFlagsObj.sdup) {
            this.lastStepPos = this.position;
            //this.lastStepRot = this.RotationMatrix;
        }

        this.POSITION_HISTORY.push({
            x: this.position.get([0, 0]),
            y: this.position.get([1, 0]),
            z: this.position.get([2, 0])
        });
    }

    // The Extended Kalman Filter "main" function
    runEKF(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj) {

        // Predict the State Error values
        this.predict(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj);
        // For each sensor input, judge the state of User and return the modules that are satisfied
        let judgeFlagsObj = this.judge(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj);
        // After Judgement
        this.update(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj, judgeFlagsObj);
    }
}