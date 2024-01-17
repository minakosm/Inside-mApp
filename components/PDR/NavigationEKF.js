import { Gravity } from "expo-sensors/build/DeviceMotion";
import * as mathjs from "mathjs";

// INIT CONSTANT 
let TOTAL_T = 0;
const INITIALIZATION_TIME = 10   // sec

// IZEA VARS
let xAccMean = 0;
let yAccMean = 0;

// IZEG VARS
let zAngMean = 0;

// IZEV VARS
let xVelMean = 0;
let yVelMean = 0;

// HDR CONSTANTS
const DRIFT_THRESHOLD = 0.15;   // RAD
const YAW_WINDOW = 20;      

// IPER CONSTANTS
const ANGLE_THRESHOLD = 0.2     // RAD
const POSITION_WINDOW = 20;

// STEPVELOCITYCHECK VARS
const ACC_THRESH = 1;
let STANCE_TIME_THRESH = 0.7;

let stepBuffer = [];

let stanceTime = 0;
let stepTime = 0;
let walkingFlag = false;
let lastStep = false;

// DEBUG 
let ITER = 0;

export class NavigationEKF{
    constructor() {

        //  STATE = [θ, x, y, ux, uy, ax, ay, ω]T
        this.State = mathjs.zeros(8,1);                                       // Initial State 
        this.Yaw = this.State.get([0,0]);                                     // 2D Yaw angle
        this.Position = this.State.subset(mathjs.index([1,2], 0));            // (X,Y) User Position Coordinates
        this.Velocity = this.State.subset(mathjs.index([3,4], 0));            // uX, uY User Velocity
        this.Acceleration = this.State.subset(mathjs.index([5,6], 0));        // ax, aY User Acceleration
        this.AngVel = this.State.get([7,0]);                                  // wZ User Angular Velocity 

        this.Rot = mathjs.identity(3)                                         // Rotation

        this.ErrorState = mathjs.zeros(8,1);                                  // State Error

        this.H = mathjs.zeros(8,8);
        this.m = mathjs.zeros(8,1);

        this.P = mathjs.multiply(0.25, mathjs.identity(8));
        this.Q = mathjs.multiply(100, mathjs.identity(8));
        this.R = mathjs.multiply(0.001, mathjs.identity(8));

        this.SamplePeriod = 0;

        this.YawHistory = [0];
        this.xPosHistory = [0];
        this.yPosHistory = [0];
        this.xVelHistory = [0];
        this.yVelHistory = [0];
        this.xAccelHistory = [0];
        this.yAccelHistory = [0];
        this.zAngVelHistory = [0];
        this.prevRotAcc = mathjs.matrix([[0],[0]]);
        this.prevEstVel = mathjs.matrix([[0],[0]]);

        this.INITIALIZED = false;

        this.xAccRotHistory = [0];
        this.yAccRotHistory = [0];
        this.zAccRotHistory = [0];

        this.xMagRotHistory = [];
        this.yMagRotHistory = [];
        this.zMagRotHistory = [];

        // STEP VELOCITY
        this.stepVelocity = [0];
        this.stepLength = [0];
        this.stepCount = 0;
    }

    setSamplePeriod(dt){
        this.SamplePeriod = dt;
    } 
    // Clean Up Function
    reset(){
        // clean state
        this.ErrorState = mathjs.zeros(8,1);
        this.State = mathjs.zeros(8,1);
        this.P = mathjs.multiply(0.01, mathjs.identity(8));

        this.Yaw = this.State.get([0,0]);                                     
        this.Position = this.State.subset(mathjs.index([1,2], 0));            
        this.Velocity = this.State.subset(mathjs.index([3,4], 0));            
        this.Acceleration = this.State.subset(mathjs.index([5,6], 0));        
        this.AngVel = this.State.get([7,0]);     

        this.Rot = mathjs.identity(3); 
        // clean observations
        this.H = mathjs.zeros(8,8);
        this.m = mathjs.zeros(8,1);

        // clean history
        this.YawHistory = [0];
        this.xPosHistory = [0];
        this.yPosHistory = [0];
        this.xAccelHistory = [0];
        this.yAccelHistory = [0];
        this.xVelHistory = [0];
        this.yVelHistory = [0];
        this.zAngVelHistory = [0];

        // ROT VALUES
        this.xAccRotHistory = [0];
        this.yAccRotHistory = [0];
        this.zAccRotHistory = [0];

        this.xMagRotHistory = [];
        this.yMagRotHistory = [];
        this.zMagRotHistory = [];

        // STEP VELOCITY
        this.stepVelocity = [0];
        this.stepLength = [0];

        this.prevRotAcc = mathjs.matrix([[0],[0]]);
        this.prevEstVel = mathjs.matrix([[0],[0]]);

        this.INITIALIZED = false;
        TOTAL_T = 0;
        ITER = 0;


        this.stepCount = 0;
        stanceTime = 0;
        stepTime = 0;
        standingFlag = true;
        walkingFlag = false;
        lastStep = false;
        stepBuffer = [];

        this.stepCount = 0;

    }

    // Initial ZEro Acceleration update
    _IZEA(accData) {
        this.xAccelHistory.push(accData[0]);
        this.yAccelHistory.push(accData[1]);

        xAccMean = this.xAccelHistory.reduce((a, b) => a + b, 0) / this.xAccelHistory.length;
        yAccMean = this.yAccelHistory.reduce((a, b) => a + b, 0) / this.yAccelHistory.length;

        this.m.set([5,0], xAccMean);
        this.m.set([6,0], yAccMean);
    }

    // Initial ZEro Gyroscope Update
    _IZEG(gyroData) {
        this.zAngVelHistory.push(gyroData);

        zAngMean = this.zAngVelHistory.reduce((a, b) => a + b, 0) / this.zAngVelHistory.length;

        this.m.set([7,0], zAngMean);
    }

    // Initial ZEro Velocity Update
    _IZEV(estVel) {
        this.xVelHistory.push(estVel.get([0,0]));
        this.yVelHistory.push(estVel.get([1,0]));

        xVelMean = this.xVelHistory.reduce((a, b) => a + b, 0) / this.xVelHistory.length;
        yVelMean = this.yVelHistory.reduce((a, b) => a + b, 0) / this.yVelHistory.length;

        this.m.set([3,0], xVelMean);
        this.m.set([4,0], yVelMean);

    }

    // Heuristic Drift Reduction
    _HDR(estYaw) {
        let k = this.YawHistory.length;
        let yawDiff;
        
        if(k < YAW_WINDOW){
            yawDiff = estYaw - this.YawHistory[0];
            // yawDiff = 0;
        } else {
            yawDiff = estYaw - this.YawHistory[k - YAW_WINDOW];
        }

        this.H.set([0,0], 1);
        mathjs.abs(yawDiff) < DRIFT_THRESHOLD ? this.m.set([0,0], yawDiff) : this.m.set([0,0], 0);

    } 

    // Investigative Position Error Reduction
    _IPER(estPos) {

        this.H.set([1,1], 0);
        this.H.set([2,2], 0);

        this.m.set([1,0], 0);
        this.m.set([2,0], 0);

        let k = this.xPosHistory.length; 
        if(k != this.yPosHistory.length){
            console.log(`NOT SAME COORDINATES HISTORY LENGTH !`);
            return;
        }

        let xPosError, yPosError;
        let r, m1, m2;

        if(k >= POSITION_WINDOW) {
            let x1 = this.xPosHistory[k-POSITION_WINDOW];
            let y1 = this.yPosHistory[k-POSITION_WINDOW];

            let x2 = this.xPosHistory[k-1];
            let y2 = this.yPosHistory[k-1];

            let x_est = estPos.get([0,0]);
            let y_est = estPos.get([1,0]);

            m1 = (y2 - y1) / (x2 - x1);
            m2 = (y_est - y1) / (x_est - x1);

            if (m1 == Infinity) {m1 = Number.MAX_VALUE} else if (m1 == -Infinity) {m1 = Number.MIN_VALUE};
            if (m2 == Infinity) {m2 = Number.MAX_VALUE} else if (m2 == -Infinity) {m2 = Number.MIN_VALUE};

            r = mathjs.atan((m1-m2)/(1 + m1*m2));
            console.log(`drift r = ${r}`);
            if(mathjs.abs(r) < ANGLE_THRESHOLD) {
                // PROJECT POINT TO M1 LINE 
                let e1_x = x2 - x1;
                let e1_y = y2 - y1;

                let e2_x = x_est - x2;
                let e2_y = y_est - y2;

                let dot = e1_x * e2_x + e1_y * e2_y;
                let len1 = e1_x* e1_x + e1_y * e1_y;

                xPosError = (x2 + (dot*e1_x) / len1) - x_est;
                yPosError = (y2 + (dot*e1_y) / len1) - y_est;
                console.log(`xPosError = ${xPosError}`);
                console.log(`yPosError = ${yPosError}`);

                this.m.set([1,0], xPosError);
                this.m.set([2,0], yPosError);

                this.H.set([1,1], 1);
                this.H.set([2,2], 1);
            }
        }
        
    }

    // stepVelocity, stepLength Estimation Function
    stepVelocityCheck(accData, rotAccData) {

        // We started walking
        if (rotAccData.get([2,0]) >= ACC_THRESH && !walkingFlag) {
            walkingFlag = !walkingFlag;

            stepTime = 0;
            stanceTime = 0;
        }

        if(walkingFlag){

            // Change Step (or check)
            stepBuffer.push({data: mathjs.sqrt(rotAccData.get([1,0]) * rotAccData.get([1,0]) + rotAccData.get([0,0]) * rotAccData.get([0,0])), check: accData[1], dtime: this.SamplePeriod});
            
            let window = stepBuffer.slice(-7);
            if(window.length < 7) {return;}

            let peakCheck = window.slice(-3).every(a => a.check < window[3].check) && window.slice(0,3).every(a => a.check < window[3].check);

            if (peakCheck) {
                stepTime += window[0].dtime + window[1].dtime;
                this.stepVelocity[this.stepCount] += mathjs.abs(window[0].data) * window[0].dtime + mathjs.abs(window[1].data) * window[1].dtime + mathjs.abs(window[2].data) * window[2].dtime;
                this.stepLength[this.stepCount] = this.stepVelocity[this.stepCount] * stepTime;

                this.stepCount++;
                this.stepVelocity[this.stepCount] = 0;
                this.stepLength[this.stepCount] = 0;
                stepTime = 0;

                stepBuffer = stepBuffer.slice(-4);

            } else {
                stepTime += window[0].dtime;
                this.stepVelocity[this.stepCount] += mathjs.abs(window[0].data) * window[0].dtime;
                this.stepLength[this.stepCount] = this.stepVelocity[this.stepCount] * stepTime;        
            }

            // Detect Standing
            if(rotAccData.get([2,0]) < ACC_THRESH) {
                stanceTime += this.SamplePeriod;
                // lastStep = stanceTime > STANCE_TIME_THRESH;
                walkingFlag = !(stanceTime > STANCE_TIME_THRESH);
            } else {
                stanceTime = 0;
            }

        } else {          
            console.log(`--------------- STANDING ---------------`);
            return;
        }


    }


    // Maybe a JudgementFunction(sensorData) ???
    // where takes sensor measurements as inputs and judges the state of pedestrian via a sliding/fixed window? 
    // states: {standing, walking:{stepping and midalk}, turning}

    update(rotMat, accDataObj, gyroDataObj, magDataObj) {

        // Get k-1 State Values
        this.Yaw = this.State.get([0,0]);
        this.Position = this.State.subset(mathjs.index([1,2], 0));
        this.Velocity = this.State.subset(mathjs.index([3,4], 0));         
        this.Acceleration = this.State.subset(mathjs.index([5,6], 0));
        this.AngVel = this.State.get([7,0]);   

        let a = [accDataObj.x, accDataObj.y, accDataObj.z];     // in m/s^2
        let w = [gyroDataObj.x, gyroDataObj.y, gyroDataObj.z];  // in deg/s
        let m = [magDataObj.x, magDataObj.y, magDataObj.z];     // in uΤ

        let a_rot = mathjs.multiply(mathjs.transpose(rotMat), mathjs.transpose([a]));
        let w_rot = mathjs.multiply(mathjs.transpose(rotMat), mathjs.transpose([w]));       // MAYBE NOT THAT
        let m_rot = mathjs.multiply(mathjs.transpose(rotMat), mathjs.transpose([m]));

        this.stepVelocityCheck(a, a_rot);

        // console.log(`++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
        // console.log(`++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
        // console.log(`stepVelocities = ${JSON.stringify(this.stepVelocity)}`);
        // console.log(`++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
        // console.log(`++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
        // console.log(`stepLengths = ${JSON.stringify(this.stepLength)}`);
        // console.log(`++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
        // console.log(`++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);

        this.xAccRotHistory.push(a_rot.get([0,0]));
        this.yAccRotHistory.push(a_rot.get([1,0]));
        this.zAccRotHistory.push(a_rot.get([2,0]));

        this.xMagRotHistory.push(m_rot.get([0,0]));
        this.yMagRotHistory.push(m_rot.get([1,0]));
        this.zMagRotHistory.push(m_rot.get([2,0]));

        // Estimate Yaw, Velocity Yaw and Position
        // let estYaw = mathjs.add(this.Yaw,  w_rot.get([2,0]) * this.SamplePeriod);
        // let estVel = mathjs.add(this.Velocity, mathjs.multiply(0.5 * this.SamplePeriod, mathjs.add(a_rot.subset(mathjs.index([0,1],0)), this.prevRotAcc)));

        // console.log(`estVel : ${estVel} = ${this.Velocity} + 1/2 ${this.SamplePeriod} (${a_rot.subset(mathjs.index([0,1],0))} + ${this.prevRotAcc})`);
        // // if(mathjs.abs(estVel.get([0,0])) < 0.01) {estVel.set([0,0], 0)}
        // // if(mathjs.abs(estVel.get([1,0])) < 0.01) {estVel.set([1,0], 0)}

        // let estPos = mathjs.add(this.Position, mathjs.multiply(0.5 * this.SamplePeriod, mathjs.add(estVel, this.Velocity)));


        // Different Estimate Model 
        let estYaw = mathjs.add(this.Yaw,  w_rot.get([2,0]) * this.SamplePeriod);

        let estVel = mathjs.multiply(mathjs.transpose(rotMat), [[0], [this.stepVelocity[this.stepCount]], [0]]).subset(mathjs.index([0,1],0));
        let estPos = mathjs.multiply(mathjs.transpose(rotMat), [[0], [this.stepLength[this.stepCount]], [0]]).subset(mathjs.index([0,1],0));

        this.prevRotAcc = a_rot.subset(mathjs.index([0,1],0));
        // this.prevEstVel = estVel;

        ITER = ITER + 1;


        // INITIALIZATION BLOCK
        if(!this.INITIALIZED){
            TOTAL_T += this.SamplePeriod;
            console.log(`TOTAL T = ${TOTAL_T}`);
            // this._IZEA([accDataObj.x, accDataObj.y]);
            // this._IZEG(gyroDataObj.z);
            // this._IZEV(estVel);
            if(TOTAL_T > INITIALIZATION_TIME) {
                this.INITIALIZED = !this.INITIALIZED;

                this.H.set([5,5], 1);
                this.H.set([6,6], 1);

                this.H.set([3,3], 1);
                this.H.set([4,4], 1);

                this.H.set([7,7], 1);

                // flush history
                this.xAccelHistory = [0];
                this.yAccelHistory = [0];

                this.xPosHistory = [0];
                this.yPosHistory = [0];

                this.xVelHistory = [0];
                this.yVelHistory = [0];
                console.log(`+\n+\n+\n_\n+\n+\n+\n+\n+\n_\n+\n+\n+\n+\n+\n_\n+\n+\n+\n+\n+\n_\n+\n+\n`);
            }
            return;
        }


        this.State.subset(mathjs.index(0,0), estYaw);
        this.State.subset(mathjs.index([1,2],0), estPos);
        this.State.subset(mathjs.index([3,4],0), estVel);
        this.State.subset(mathjs.index([5,6],0), [[a[0]],[a[1]]]);
        this.State.subset(mathjs.index(7,0), gyroDataObj.z);
        // ERROR MODEL EKF 

        // x' = Fx + w
        // P' = FPFt + Q
        
        // Error State consists of Yaw, Pos, Vel, AccBias, GyroBias
        let F_yaw = [1, 0, 0, 0, 0, 0, 0, this.SamplePeriod * rotMat.get([2,2])];
        let F_pos = mathjs.matrix([[0, 1, 0, this.SamplePeriod, 0, 0, 0, 0], [0, 0, 1, 0, this.SamplePeriod, 0, 0, 0]]);
        let F_vel = mathjs.matrix([[-this.SamplePeriod * a_rot.get([1,0]), 0, 0, 1, 0, this.SamplePeriod * rotMat.get([0,0]), this.SamplePeriod * rotMat.get([0,1]), 0], [-this.SamplePeriod * a_rot.get([0,0]), 0, 0, 0, 1, this.SamplePeriod * rotMat.get([1,0]), this.SamplePeriod * rotMat.get([1,1]), 0]]);
        let F_acc = mathjs.matrix([[0, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0, 1, 0]]);
        let F_gyr = [0, 0, 0, 0, 0, 0, 0, 1];

        let F = mathjs.concat([F_yaw], F_pos, F_vel, F_acc, [F_gyr], 0);

        let estErrState = mathjs.multiply(F, this.ErrorState);
        let estP = mathjs.add(mathjs.multiply(F, this.P, mathjs.transpose(F)), this.Q);
        // UPDATE 
        // MAKE ERROR MODELS 

        this._HDR(estYaw);
        this._IPER(estPos);

        // xVelMean, yVelMean, zAngMean, xAccMean, yAccMean
        // m 8x1 

        // console.log(`xAccMean, yAccMean = ${[xAccMean, yAccMean]}`);
        // console.log(`xVelMean, yVealMean = ${[xVelMean, yVelMean]}`);
        // console.log(`zAngMean = ${zAngMean}`);

        // console.log(`-------------------------`);

        // this.m.set([3,0], xVelMean);
        // this.m.set([4,0], yVelMean);

        // this.m.set([5,0], xAccMean);
        // this.m.set([6,0], yAccMean);

        // this.m.set([7,0], zAngMean);



        let S = mathjs.add(mathjs.multiply(this.H, estP, mathjs.transpose(this.H)), this.R);
        let K = mathjs.multiply(estP, mathjs.transpose(this.H), mathjs.inv(S));

        this.ErrorState = mathjs.add(estErrState, mathjs.multiply(K, mathjs.subtract(this.m, mathjs.multiply(this.H, estErrState))));
        this.State = mathjs.subtract(this.State, this.ErrorState);

        let dKH = mathjs.subtract(mathjs.identity(8), mathjs.multiply(K, this.H));
        let E = mathjs.multiply(K, this.R, mathjs.transpose(K));
        this.P = mathjs.add(mathjs.multiply(dKH, estP, mathjs.transpose(dKH)), E);              
        
        // Correct Rotation

        // let dPsi = [w[0] * this.SamplePeriod, w[1] * this.SamplePeriod, w[2] * this.SamplePeriod];
        // let skewH = mathjs.multiply(-1, mathjs.matrix([[0, -dPsi[2], dPsi[1]], [dPsi[2], 0, -dPsi[0]], [-dPsi[1], dPsi[0], 0]]));
        // let num = mathjs.add(mathjs.multiply(2, mathjs.identity(3)), skewH);
        // let den = mathjs.inv(mathjs.subtract(mathjs.multiply(2, mathjs.identity(3)), skewH));
        // this.Rot = mathjs.multiply(num, den, this.Rot);

        // Update History
        this.YawHistory.push(this.State.get([0,0]));
        this.xPosHistory.push(this.State.get([1,0]));
        this.yPosHistory.push(this.State.get([2,0]));

        this.xVelHistory.push(this.State.get([3,0]));
        this.yVelHistory.push(this.State.get([4,0]));
    }
}

