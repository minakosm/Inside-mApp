
export default class MadgwickFilter {
    constructor(samplePeriod, beta) {
        this.SamplePeriod = samplePeriod;
        this.Beta = beta;
        this.Quaternion = [1, 0, 0, 0];
    }

    getBeta() {return this.Beta;}  
    getSamplePeriod() {return this.SamplePeriod;}
    getQuaternion() {return [this.Quaternion[0], this.Quaternion[1], this.Quaternion[2], this.Quaternion[3]]};

    setBeta(b) {this.Beta = b;}
    setSamplePeriod(s) {this.SamplePeriod = s;}
    setQuaternion(q) {
        this.Quaternion[0] = q[0];
        this.Quaternion[1] = q[1];
        this.Quaternion[2] = q[2];
        this.Quaternion[3] = q[3];
    }

    update(accDataObj, gyroDataObj, magDataObj) {
        let ax = accDataObj.x;
        let ay = accDataObj.y;
        let az = accDataObj.z;

        let gx = gyroDataObj.x * (Math.PI / 180);
        let gy = gyroDataObj.y * (Math.PI / 180);
        let gz = gyroDataObj.z * (Math.PI / 180);

        let mx = magDataObj.x;
        let my = magDataObj.y;
        let mz = magDataObj.z;

        let qw = this.Quaternion[0];
        let qx = this.Quaternion[1];
        let qy = this.Quaternion[2];
        let qz = this.Quaternion[3];

        let norm; 
        let hx, hy, _2bx, _2bz;
        let sw, sx, sy, sz;
        let qDot_w, qDot_x, qDot_y, qDot_z;

        // Auxilary Variables
        let _2qwmx, _2qwmy, _2qwmz, _2qxmx;
        let _4bx, _4bz;

        const _2qw = 2 * qw;
        const _2qx = 2 * qx;
        const _2qy = 2 * qy; 
        const _2qz = 2 * qz;
        const _2qwqy = 2 * qw * qy;
        const _2qyqz = 2* qw * qz; 

        const qwqw = qw * qw; 
        const qwqx = qw * qx;
        const qwqy = qw * qy;
        const qwqz = qw * qz;
        const qxqx = qx * qx;
        const qxqy = qx * qy;
        const qxqz = qx * qz;
        const qyqy = qy * qy;
        const qyqz = qy * qz;
        const qzqz = qz * qz;

        // Normalize accelerometer measurements
        norm = Math.sqrt(ax*ax + ay*ay + az*az);
        if(norm == 0){
            console.log(`RETURN FROM ACC NORM`);
            return;
        }
        norm = 1/norm;
        ax *= norm;
        ay *= norm;
        az *= norm;

        //Normalize magnetometer measurments
        norm = Math.sqrt(mx*mx + my*my + mz*mz);
        if(norm == 0){
            console.log(`RETURN FROM MAG NORM`);    
            return;
        }
        norm = 1/norm;
        mx *= norm;
        my *= norm;
        mz *= norm;

        // Reference direction of Earth's magnetic field
        _2qwmx = 2 * qw * mx;
        _2qwmy = 2 * qw * my;
        _2qwmz = 2 * qw * mz;
        _2qxmx = 2 * qx * mx;

        hx = mx * qwqw - _2qwmy * qz + _2qwmz * qy + mx * qxqx + _2qx * my * qy + _2qx * mz * qz - mx * qyqy - mx * qzqz;
        hy = _2qwmx * qz + my * qwqw - _2qwmz * qx + _2qxmx * qy - my * qxqx + my * qzqz + _2qy * mz * qz - my * qzqz;

        _2bx = Math.sqrt(hx*hx + hy*hy);
        _2bz = -_2qwmx * qy + _2qwmy * qx + mz * qwqw + _2qxmx * qz - mz * qxqx + _2qy * my * qz - mz * qyqy + mz * qzqz;
        _4bx = 2 * _2bx;
        _4bz = 2 * _2bz;

        // Gradient decent algorithm corrective step 
        sw = -_2qy * (2 * qxqz - _2qwqy - ax) + _2qx * (2 * qwqx + _2qyqz - ay) - _2bz * qy * (_2bx * (0.5 - qyqy - qzqz) + _2bz * (qxqz - qwqy) - mx) + (-_2bx * qz + _2bz * qx) * (_2bx * (qxqy - qwqz) + _2bz * (qwqx + qyqz) - my) + _2bx * qy * (_2bx * (qwqy + qxqz) + _2bz * (0.5 - qxqx - qyqy) - mz);
        sx = _2qz * (2 * qxqz - _2qwqy - ax) + _2qw * (2 * qwqx + _2qyqz - ay) - 4 * qx * (1 - 2 * qxqx - 2 * qyqy - az) + _2bz * qz * (_2bx * (0.5 - qyqy - qzqz) + _2bz * (qxqz - qwqy) - mx) + (_2bx * qy + _2bz * qw) * (_2bx * (qxqy - qwqz) + _2bz * (qwqx + qyqz) - my) + (_2bx * qz - _4bz * qx) * (_2bx * (qwqy + qxqz) + _2bz * (0.5 - qxqx - qyqy) - mz);
        sy = -_2qw * (2 * qxqz - _2qwqy - ax) + _2qz * (2 * qwqx + _2qyqz - ay) - 4 * qy * (1 - 2 * qxqx - 2 * qyqy - az) + (-_4bx * qy - _2bz * qw) * (_2bx * (0.5 - qyqy - qzqz) + _2bz * (qxqz - qwqy) - mx) + (_2bx * qx + _2bz * qz) * (_2bx * (qxqy - qwqz) + _2bz * (qwqx + qyqz) - my) + (_2bx * qw - _4bz * qy) * (_2bx * (qwqy + qxqz) + _2bz * (0.5 - qxqx - qyqy) - mz);
        sz = _2qx * (2 * qxqz - _2qwqy - ax) + _2qy * (2 * qwqx + _2qyqz - ay) + (-_4bx * qz + _2bz * qx) * (_2bx * (0.5 - qyqy - qzqz) + _2bz * (qxqz - qwqy) - mx) + (-_2bx * qw + _2bz * qy) * (_2bx * (qxqy - qwqz) + _2bz * (qwqx + qyqz) - my) + _2bx * qx * (_2bx * (qwqy + qxqz) + _2bz * (0.5 - qxqx - qyqy) - mz);
        
        norm = 1 / Math.sqrt(sw * sw + sx * sx + sy * sy + sz * sz);    // normalise step magnitude
        sw *= norm;
        sx *= norm;
        sy *= norm;
        sz *= norm;

        // Compute rate of change of quaternion
        qDot_w = 0.5 * (-qx * gx - qy * gy - qz *  gz) - this.Beta * sw;
        qDot_x = 0.5 * (qw * gx + qy * gz - qz * gy) - this.Beta * sx;
        qDot_y = 0.5 * (qw * gy - qx * gz + qz * gx) - this.Beta * sy;
        qDot_z = 0.5 * (qw * gz + qx * gy - qy * gx) - this.Beta * sz;
        
        // Intergrate to yield quaternion
        qw += qDot_w * this.SamplePeriod;
        qx += qDot_x * this.SamplePeriod;
        qy += qDot_y * this.SamplePeriod;
        qz += qDot_z * this.SamplePeriod;
        
        // Normalize Quaternion
        norm = 1 / Math.sqrt(qw*qw + qx*qx + qy*qy + qz*qz);
        this.Quaternion[0] = qw*norm;
        this.Quaternion[1] = qx*norm;
        this.Quaternion[2] = qy*norm;
        this.Quaternion[3] = qz*norm;
    }
}
