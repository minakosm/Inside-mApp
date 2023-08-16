import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Dimensions, AppState, TouchableOpacity } from "react-native";
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion, MagnetometerUncalibrated} from "expo-sensors";
import { SensorData } from "../utils/SensorData";
import { isRejectedWithValue } from "@reduxjs/toolkit";

import { Gravity } from "expo-sensors/build/DeviceMotion";

import MadgwickFilter from "./MadgwickFilter";
import { AttitudeEstimator } from "./AttitudeEstimation";

const _freqUpdate = 30; 

const accelerometerData = new SensorData();
const gyroscopeData = new SensorData();
const magnetometerData = new SensorData();


const attEst = new AttitudeEstimator(_freqUpdate);

export default PDRApp = () => {

    const [deviceMotionData, setDeviceMotionData] = useState({
        acceleration: {},
        accelerationIncludingGravity: {},
        accelerationGravity: {},
        rotation: {},
        rotationRate: {}
    });

    const [start, setStart] = useState(false);
    const [clear, setClear] = useState(true);
    
    const [eulerAngles, setEulerAngles] = useState([0,0,0]);

    const isFirstRender = useRef(true);
    const isBufferFull = useRef([false, false, false]);

    const update = () => {
        attEst.update(accelerometerData, gyroscopeData, magnetometerData);
        // setEkfOrientation(attEst.getQuaternion());
        setEulerAngles(attEst.getEulerAngles());
        isBufferFull.current = [false, false, false];
    }

    const _subscribe = () => {
        Promise.all([DeviceMotion.isAvailableAsync(), Gyroscope.isAvailableAsync(), Magnetometer.isAvailableAsync(), Accelerometer.isAvailableAsync()])
            .then(() => {
                console.log(`START SUBSCRIPTIONS`);
                Gyroscope.setUpdateInterval(_freqUpdate);
                Magnetometer.setUpdateInterval(_freqUpdate);
                Accelerometer.setUpdateInterval(_freqUpdate);
                setStart(true);
                setClear(false);

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

        setStart(false);
        console.log('STOP SUBSCRIPTIONS');
    }

    const _clear = () => {
        _unsubscribe();

        setClear(true);

        setEulerAngles(() => {
            attEst.reset();
            return attEst.getEulerAngles();
        })

        setDeviceMotionData({
            acceleration: {},
            accelerationIncludingGravity: {},
            accelerationGravity: {},
            rotation: {},
            rotationRate: {}
        });

        accelerometerData.clear();
        gyroscopeData.clear();
        magnetometerData.clear();

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
            <View style={{ marginVertical: 15 }}>
                <Text>Acceleration g </Text>
                <Text>x: {accelerometerData.x}</Text>
                <Text>y: {accelerometerData.y}</Text>
                <Text>z: {accelerometerData.z}</Text>
            </View>
            {/*<View style={{ marginVertical: 15 }}>
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
                </View> */}
            <View style={{ marginVertical: 15 }}>
                <Text>Magnetometer μT</Text>
                <Text>x: {magnetometerData.x}</Text>
                <Text>y: {magnetometerData.y}</Text>
                <Text>z: {magnetometerData.z}</Text>
                </View>
            <View style={{ marginVertical: 15 }}>
                <Text>Rotation Rate deg/s</Text>
                <Text>x: {gyroscopeData.x}</Text>
                <Text>y: {gyroscopeData.y}</Text>
                <Text>z: {gyroscopeData.z}</Text>
            </View>
            <View style={{ marginVertical: 50 }}>
                <Text>yaw: {eulerAngles[0].toFixed(2)}  pitch: {eulerAngles[1].toFixed(2)}  roll: {eulerAngles[2].toFixed(2)}  </Text>
            </View>
            <View style={{ marginVertical: 15}}>
                <Text>Gyro Bias: {JSON.stringify([attEst.getBias()[0].toFixed(3), attEst.getBias()[1].toFixed(3), attEst.getBias()[2].toFixed(3)])}</Text>
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