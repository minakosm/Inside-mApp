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
const SDUP_MAX_TIME = 1;                        // Maximum Step Time Threshold
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

    // Has to be an Object of x,y,z Arrays
    set( dataObject ) {
        let xExists = this.checkIfKeyExists(dataObject, "x");
        let yExists = this.checkIfKeyExists(dataObject, "y");
        let zExists = this.checkIfKeyExists(dataObject, "z");

        if(xExists && yExists && zExists) {
            this.data = dataObject;
        }
        
    }

    // Push a single measurement to the class object
    push( dataObject ) {
        let xExists = this.checkIfKeyExists(dataObject, "x");
        let yExists = this.checkIfKeyExists(dataObject, "y");
        let zExists = this.checkIfKeyExists(dataObject, "z");

        if(xExists && yExists && zExists) {
            this.data.x.push(dataObject.x);
            this.data.y.push(dataObject.y);
            this.data.z.push(dataObject.z);
        }
    }

    // Push a single measurement and remove the first from the class object
    pushAndShift( dataObject ) {
        let xExists = this.checkIfKeyExists(dataObject, "x");
        let yExists = this.checkIfKeyExists(dataObject, "y");
        let zExists = this.checkIfKeyExists(dataObject, "z");

        if(xExists && yExists && zExists) {
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
        if (this.data.y.length === len && this.data.z.length === len) {return len;} else {throw new Error('DataHistory.length : Missmatched length of components x-y-z');}
    }
    // utility function
    checkIfKeyExists( objectName, keyName ) {
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

export class nav3{
    // Class Constructor 
    constructor() {

        // State Variables 
        this.position = math.zeros(3,1);
        this.velocity = math.zeros(3,1);
        this.attitude = [1, 0, 0, 0];       // Attitude Quaternion [w, x, y, z]

        // Error Variables 
        this.dp = math.zeros(3,1);
        this.dv = math.zeros(3,1);
        this.da = math.zeros(3,1);

        // Last Step History
        this.lastStepPos = math.zeros(3,1);
        this.lastStepVel = math.zeros(3,1);
        this.lastStepRot = math.identity(3);

        // Quaternion for Attitude Estimation
        // q = [w, x, y, z]
        this.quaternion = [1, 0, 0, 0];

        // Rotation Matrix from Quaternion 
        this.RotationMatrix = math.identity(3);

        // Sensor Biases
        this.gyroBias = math.zeros(3,1);
        this.accBias = math.zeros(3,1);

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
    }

    setDt (dt) {
        this.dt = dt;
    }

    // Clean Up Function
    reset() {

        // Clear State Variables 
        this.position = math.zeros(3,1);
        this.velocity = math.zeros(3,1);
        this.attitude = [1, 0, 0, 0];

        // Clear Error Variables 
        this.dp = math.zeros(3,1);
        this.dv = math.zeros(3,1);
        this.da = math.zeros(3,1);

        // Clear Last Step History
        this.lastStepPos = math.zeros(3,1);
        this.lastStepVel = math.zeros(3,1);
        this.lastStepRot = math.identity(3);

        // Clear Sensor Biases
        this.gyroBias = math.zeros(3,1);
        this.accBias = math.zeros(3,1);

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
        
        // DEBBUG
        DEBUG_1 = 0;
    }

    // 3x3 Skew Symmetric matrix
    skewSymmetric(v) {
        return math.matrix([[    0, -v[2],    v[1]],
                            [ v[2],     0,   -v[0]],
                            [-v[1],  v[0],       0]]);
    }

    // Quaternion Multiplication Helper Function
    quaternionMulti(q1, q2) {
        // q1 = [w1, x1, y1, z1], q2 = [w2, x2, y2, z2]

        return [q1[0]*q2[0] - q1[1]*q2[1] - q1[2]*q2[2] - q1[3]*q2[3],
                q1[0]*q2[1] + q1[1]*q2[0] + q1[2]*q2[3] - q1[3]*q2[2],
                q1[0]*q2[2] - q1[1]*q2[3] + q1[2]*q2[0] + q1[3]*q2[1],
                q1[0]*q2[3] + q1[1]*q2[2] - q1[2]*q2[1] + q1[3]*q2[0]];

    }

    // Utility function that transforms a given quaternion q to a Rotation Matrix R
    quaternion2matrix(q) {
        // q = [w, x, y, z]
        return math.matrix([[1 - 2*(q[2]*q[2] + q[3]*q[3]),      2*(q[1]*q[2] - q[0]*q[3]),          2*(q[1]*q[3] + q[0]*q[2])], 
                            [2*(q[1]*q[2] + q[0]*q[3]),      1 - 2*(q[1]*q[1] + q[3]*q[3]),          2*(q[2]*q[3] - q[0]*q[1])], 
                            [2*(q[1]*q[3] - q[0]*q[2]),          2*(q[2]*q[3] + q[0]*q[1]),      1 - 2*(q[1]*q[1] + q[2]*q[2])]]);
    }

    // Utility Function that transforms given rpy angles to its corresponding quaternion
    rpy2quaternion(r, p, y) {
        let qx = math.sin(r/2) * math.cos(p/2) * math.cos(y/2) - math.cos(r/2) * math.sin(p/2) * math.sin(y/2);
        let qy = math.cos(r/2) * math.sin(p/2) * math.cos(y/2) + math.sin(r/2) * math.cos(p/2) * math.sin(y/2);
        let qz = math.cos(r/2) * math.cos(p/2) * math.sin(y/2) - math.sin(r/2) * math.sin(p/2) * math.cos(y/2);
        let qw = math.cos(r/2) * math.cos(p/2) * math.cos(y/2) + math.sin(r/2) * math.sin(p/2) * math.sin(y/2);

        return [qw, qx, qy, qz];
    }

    // Utility Function that calculates Quaternion based on Gyro Readings
    quaternionFromGyro( gyroscopeDataObj ) {
        let omega = [gyroscopeDataObj.x * math.pi/180, gyroscopeDataObj.y * math.pi/180, gyroscopeDataObj.z * math.pi/180];
        let theta = math.norm(omega) * this.dt;

        let dw = (math.norm(omega) == 0) ? [0, 0, 0] : omega.map((v) => v / math.norm(omega));
        let dq = [math.cos(theta/2), dw[0] * math.sin(theta/2), dw[1] * math.sin(theta/2), dw[2] * math.sin(theta/2)];

        // console.log(`attitude = ${this.attitude}`);
        // console.log(`dq = ${dq}`);

        return this.quaternionMulti(dq, this.attitude);
    }

    
    // State Prediction Function   
    predict(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj, rotationMatrix) {
        // this.RotationMatrix = this.quaternion2matrix(this.attitude);
        this.RotationMatrix = rotationMatrix;
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
        IPER    -   Investigative Position Error Reduction
        IHER    -   Investigative Heading Error Reduction (?)
    */

    /* ZERO VELOCITY UPDATE 
        This judgement module recognizes whether the user is in a relative stable state.
        
        This means that if the user is standing still, the accelerometer readings should be 
        close to zero. 
    */
    ZEMU() {
        // Make Shallow Copy of DataHistory Objects
        let accW = JSON.parse(JSON.stringify(this.accWindow));

        //Z
        accW.data.z.length < WINDOW ? varAZ = 0 : varAZ = math.variance(accW.data.z);

        let accFlag = varAZ < ZUPT_VAR_ACC_THRESH;
        if(accFlag) {
            this.dv = this.velocity;
            this.lastStepVel = math.zeros(3,1);
            console.log(`STANDING ${DEBUG_1}`);
            return true;
        } else {
            console.log(`WALKING ${DEBUG_1}`);
            return false;
        }
    }   

    /*  ZERO ANGULAR RATE UPDATE  
        This judgement module recognizes whether the user makes a turn or not 
    */

    ZARU() {

    }

    /* STEP DETECTION AND UPDATE  
        This judgement module detects step events and calculates their length and velocity
    */
    SDUP() {
        let K = 0;
        for(let i=0; i<SDUP_Z_LP.length - 1; i++) {
            if(SDUP_Z_LP[i] > SDUP_ACC_THRESHOLD && !SDUP_STEP_DETECTED){
                SDUP_STEP_DETECTED = true;
                SDUP_TIMEOUT = 0;

                SDUP_MAX = -100;
                SDUP_MIN = 100;
            }

            if(SDUP_STEP_DETECTED){
                SDUP_MAX = math.max(SDUP_MAX, SDUP_Z_LP[i]);
                SDUP_MIN = math.min(SDUP_MIN, SDUP_Z_LP[i]);

                if(SDUP_Z_LP[i] > 0 && SDUP_Z_LP[i+1] < 0) {
                    SDUP_ZERO_CROSS = true;
                }

                if((SDUP_Z_LP[i+1] > 0 && SDUP_ZERO_CROSS) || SDUP_TIMEOUT > SDUP_MAX_TIME){
                    SDUP_STEP_DETECTED = false;
                    SDUP_ZERO_CROSS = false;

                    if(SDUP_MAX + math.abs(SDUP_MIN) > 4.5) {
                        K = 0.7;
                    } else {
                        K = 0.579;
                    }
                    
                    STEP_COUNTER++;
                    STEP_ARRAY[STEP_COUNTER - 1] = K * math.nthRoot(SDUP_MAX + math.abs(SDUP_MIN), 4);
                    this.lastStepVel.set([1,0], STEP_ARRAY[STEP_COUNTER - 1] / SDUP_TIMEOUT);
                    SDUP_Z_LP.splice(0,i+1);
                    console.log(`STEP_ARRAY = ${STEP_ARRAY}`);
                    console.log(`nr of steps: ${STEP_COUNTER}   \t len = ${math.sum(STEP_ARRAY)}`);

                    // Update State Error Variables
                    this.dp = math.subtract(this.position, math.add(this.lastStepPos, math.multiply(this.lastStepRot, math.matrix([[0],[STEP_ARRAY[STEP_COUNTER - 1]],[0]]))));
                    // this.dv = math.subtract(this.velocity, math.multiply(this.RotationMatrix, this.lastStepVel));

                    return true;
                }

                SDUP_TIMEOUT += this.dt;
            }
        }
        SDUP_STEP_DETECTED = false;
        SDUP_ZERO_CROSS = false;
        
        this.dv = math.subtract(math.subtract(this.velocity, math.multiply(this.lastStepRot, this.lastStepVel)), math.multiply(this.RotationMatrix, this.skewSymmetric([this.velocity.get([0,0]), this.velocity.get([1,0]), this.velocity.get([0,0])]), this.da)); 
        return false;
    }

    // Pass the Data to the correspondig Windows

    prepDataHistory(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj) {
        // Rotate Data
        let acc = math.matrix([[accelerometerDataObj.x], [accelerometerDataObj.y], [accelerometerDataObj.z]]);
        let gyro = math.matrix([[gyroscopeDataObj.x], [gyroscopeDataObj.y], [gyroscopeDataObj.z]]);
        let mag = math.matrix([[magnetometerDataObj.x], [magnetometerDataObj.y], [magnetometerDataObj.z]]);

        let rotAccObj = {x: math.multiply(this.RotationMatrix, acc).get([0,0]),
                         y: math.multiply(this.RotationMatrix, acc).get([1,0]),
                         z: math.multiply(this.RotationMatrix, acc).get([2,0])};

        let rotGyroObj = {x: math.multiply(this.RotationMatrix, gyro).get([0,0]),
                          y: math.multiply(this.RotationMatrix, gyro).get([1,0]),
                          z: math.multiply(this.RotationMatrix, gyro).get([2,0])};

        let rotMagObj = {x: math.multiply(this.RotationMatrix, mag).get([0,0]),
                         y: math.multiply(this.RotationMatrix, mag).get([1,0]),
                         z: math.multiply(this.RotationMatrix, mag).get([2,0])};
        
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
            if(lenAcc < WINDOW) {
                this.accWindow.push(accelerometerDataObj);
                this.gyroWindow.push(gyroscopeDataObj);
                this.magWindow.push(magnetometerDataObj);

                this.rotAccWindow.push(rotAccObj);
                this.rotGyroWindow.push(rotGyroObj);
                this.rotMagWindow.push(rotMagObj);

                SDUP_Z_LP.push(0);

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
        
        // ZERO ANGULAR RATE UPDATE
    
        // IF USER IS WALKING, CHECK FOR STEPS 
        if(!judgeFlagObj.zemu){
            // STEP DETECTION AND LENGTH/VELOCITY EXTRACTION 
            judgeFlagObj.sdup = this.SDUP();
            
        }

        return judgeFlagObj;
    }

    // State Update Function
    update(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj, judgeFlagsObj) {

        let accData = [accelerometerDataObj.x, accelerometerDataObj.y, accelerometerDataObj.z];

        // Update State Variables 
        // Attitude
        this.attitude = this.quaternionFromGyro(gyroscopeDataObj);
        // console.log(`quaternion From Gyro = ${this.attitude}`);
        let errorQ = this.rpy2quaternion(this.da.get([0,0]), this.da.get([1,0]), this.da.get([2,0]));
        this.attitude = this.quaternionMulti(errorQ, this.attitude);

        // Update Rotations
        this.RotationMatrix = this.quaternion2matrix(this.attitude);

        // Velocity
        this.velocity = math.add(this.velocity, math.multiply(this.RotationMatrix, math.transpose([accData]), this.dt));
        this.velocity = math.subtract(this.velocity, this.dv);

        // Position 
        this.position = math.add(this.position, math.multiply(this.velocity, this.dt));
        this.position = math.subtract(this.position, this.dp);

        console.log(`this.position = ${this.position}`);
        console.log(`this.velocity = ${this.velocity}`);
        // Satisfied modules 
        // Flags = [zemu, sdup];
        if(judgeFlagsObj.sdup){
            this.lastStepPos = this.position;
            this.lastStepRot = this.RotationMatrix;
        }
    }

    // The Extended Kalman Filter "main" function
    runEKF(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj, rotationMatrix) {

        // Predict the State Error values
        this.predict(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj, rotationMatrix);
        // For each sensor input, judge the state of User and return the modules that are satisfied
        let judgeFlagsObj = this.judge(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj);
        // After Judgement
        this.update(accelerometerDataObj, gyroscopeDataObj, magnetometerDataObj, judgeFlagsObj);
    }
}