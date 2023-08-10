import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Dimensions, AppState, TouchableOpacity } from "react-native";
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion, MagnetometerUncalibrated} from "expo-sensors";
import { SensorData } from "../utils/SensorData";
import { isRejectedWithValue } from "@reduxjs/toolkit";

import { Gravity } from "expo-sensors/build/DeviceMotion";
import { ExtendedKalmanFilter, ExtendedKalmanFilter2 } from "./ExtendedKalmanFilter";
import MadgwickFilter from "./MadgwickFilter";

const _freqUpdate = 50;
const beta = 0.041;

const noiseVariances = [0.3*0.3, 0.5*0.5, 0.8*0.8];

const accelerometerData = new SensorData();
const gyroscopeData = new SensorData();
const magnetometerData = new SensorData();

// const madgwick = new MadgwickFilter(_freqUpdate, beta);
const ekf2 = new ExtendedKalmanFilter2(_freqUpdate);

export default PDRApp = () => {
    // const [devSub, setDevSub] = useState(null);

    // const [deviceMotionData, setDeviceMotionData] = useState({
    //     acceleration: {},
    //     accelerationIncludingGravity: {},
    //     accelerationGravity: {},
    //     rotation: {},
    //     rotationRate: {}
    // });

    const [start, setStart] = useState(false);
    const [clear, setClear] = useState(true);

    // const [deviceMadgwickOrientation, setDeviceMadgwickOrientation] = useState(madgwick.getQuaternion());
    const [ekfOrientation, setEkfOrientation] = useState(ekf2.getQuaternion());

    const [eulerAngles, setEulerAngles] = useState([0,0,0]);

    const isFirstRender = useRef(true);
    const isBufferFull = useRef([false, false, false]);

    const update = () => {
        // madgwick._update(accelerometerData, gyroscopeData, magnetometerData);
        ekf2.update(accelerometerData, gyroscopeData, magnetometerData);
        // setDeviceMadgwickOrientation(madgwick.getQuaternion());
        setEkfOrientation(ekf2.getQuaternion());
        setEulerAngles(ekf2.getEulerAngles());
        isBufferFull.current = [false, false, false];
    }

    const _subscribe = () => {
        Promise.all([DeviceMotion.isAvailableAsync(), Gyroscope.isAvailableAsync(), Magnetometer.isAvailableAsync(), Accelerometer.isAvailableAsync()])
            .then(() => {
                console.log(`START SUBSCRIPTIONS`);
                // DeviceMotion.setUpdateInterval(_freqUpdate);
                Gyroscope.setUpdateInterval(_freqUpdate);
                Magnetometer.setUpdateInterval(_freqUpdate);
                Accelerometer.setUpdateInterval(_freqUpdate);
                setStart(true);
                setClear(false);
                
                // setDevSub(DeviceMotion.addListener((data) => {
                //     setDeviceMotionData({acceleration: data.acceleration, 
                //         accelerationIncludingGravity: data.accelerationIncludingGravity, 
                //         accelerationGravity: {x: (data.accelerationIncludingGravity.x - data.acceleration.x),
                //             y: (data.accelerationIncludingGravity.y - data.acceleration.y),
                //             z: (data.accelerationIncludingGravity.z - data.acceleration.z)},
                //         rotation: {alpha: data.rotation.alpha, beta: data.rotation.beta, gamma: data.rotation.gamma}, 
                //         rotationRate: {alpha: data.rotationRate.alpha, beta: data.rotationRate.beta, gamma: data.rotationRate.gamma}});
                // }));
                Accelerometer.addListener((data) => {
                    accelerometerData.setData({x: data.x, y: data.y, z: data.z});
                    isBufferFull.current[0] = true;
                });

                Gyroscope.addListener((data) => {
                    gyroscopeData.setData({x: data.x, y: data.y, z: data.z});
                    isBufferFull.current[1] = true;
                });

                Magnetometer.addListener((data) => {
                    magnetometerData.setData({x: data.x, y: data.y, z: data.z});
                    isBufferFull.current[2] = true;
                    if(isBufferFull.current.every((v) => v == true)) {
                        update();
                    }
                })
                
            });

        
    }

    const _unsubscribe = () => {
        Accelerometer.removeAllListeners();
        Gyroscope.removeAllListeners();
        Magnetometer.removeAllListeners();
        // devSub && devSub.remove();
        // setDevSub(null);

        setStart(false);
        console.log('STOP SUBSCRIPTIONS');
    }

    const _clear = () => {
        _unsubscribe();

        setClear(true);
        // setDeviceMadgwickOrientation(() => {
        //     madgwick.setQuaternion([1,0,0,0]);
        //     return madgwick.getQuaternion();
        // });

        setEkfOrientation(() => {
            ekf2.reset();
            return ekf2.getQuaternion();
        })
        // ekf._reset();
        // setDeviceMotionData({
        //     acceleration: {},
        //     accelerationIncludingGravity: {},
        //     accelerationGravity: {},
        //     rotation: {},
        //     rotationRate: {}
        // });

        accelerometerData.clear();
        gyroscopeData.clear();
        magnetometerData.clear();

        setEulerAngles([0,0,0]);
        isBufferFull.current = [false, false, false];
    }

    useEffect(() => {
        if(isFirstRender.current){
            isFirstRender.current = false;
            return;
        }
        _subscribe();
        return _clear();
    }, []);

    return (
        <View style={{
            marginVertical: 40,
            alignItems: 'center'
        }}>
            <Text>PDR APP</Text>
            <Text>Running: {JSON.stringify(start)}</Text>
            {/* <View style={{ marginVertical: 15 }}>
                <Text>Acceleration g </Text>
                <Text>x: {accelerometerData.x}</Text>
                <Text>y: {accelerometerData.y}</Text>
                <Text>z: {accelerometerData.z}</Text>
            </View>
            <View style={{ marginVertical: 15 }}>
                <Text>Acceleration DM</Text>
                <Text>x: {deviceMotionData.acceleration.x}</Text>
                <Text>y: {deviceMotionData.acceleration.y}</Text>
                <Text>z: {deviceMotionData.acceleration.z}</Text>
            </View>
            <View style={{ marginVertical: 15 }}>
                <Text>Gravity m/s^2</Text>
                <Text>|G| = {Math.sqrt(
                    Math.pow(deviceMotionData.accelerationGravity.x, 2) +
                    Math.pow(deviceMotionData.accelerationGravity.y, 2) +
                    Math.pow(deviceMotionData.accelerationGravity.z, 2)
                ).toPrecision(4)}</Text>
                <Text>x: {deviceMotionData.accelerationGravity.x}</Text>
                <Text>y: {deviceMotionData.accelerationGravity.y}</Text>
                <Text>z: {deviceMotionData.accelerationGravity.z}</Text>
            </View>
            <View style={{ marginVertical: 15 }}>
                <Text>Rotation rad</Text>
                <Text>x: {magnetometerData.x}</Text>
                <Text>y: {magnetometerData.y}</Text>
                <Text>z: {magnetometerData.z}</Text>
                </View> */}
            {/* <View style={{ marginVertical: 15 }}>
                <Text>Rotation Rate deg/s</Text>
                <Text>x: {gyroscopeData.x}</Text>
                <Text>y: {gyroscopeData.y}</Text>
                <Text>z: {gyroscopeData.z}</Text>
            </View>
            <View style={{ marginVertical: 50 }}>
                <Text>Madgwick Quaternion  {deviceMadgwickOrientation[0].toFixed(3)}  {deviceMadgwickOrientation[1].toFixed(3)}  {deviceMadgwickOrientation[2].toFixed(3)}  {deviceMadgwickOrientation[3].toFixed(3)}</Text>
            </View>
            <View style={{ marginVertical: 50 }}>
                <Text>EKF2 Quaternion  {ekfOrientation[0]}  {ekfOrientation[1]}  {ekfOrientation[2]}  {ekfOrientation[3]}</Text>
            </View> */}
            <View style={{ marginVertical: 50 }}>
                <Text>yaw: {eulerAngles[0].toFixed(2)}  pitch: {eulerAngles[1].toFixed(2)}  roll: {eulerAngles[2].toFixed(2)}  </Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={start ? _unsubscribe : _subscribe} style={styles.button}>
                    <Text>{!start ? 'START' : 'STOP'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={_clear} style={styles.button}>
                    <Text>{'CLEAR'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: "white",
        padding: 10,
        marginVertical: 10,
    },
    button: {
        marginHorizontal: 10,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: "white",
        flex: 1,
        width: 40,
        height: 40,
        elevation: 5
    },
});