import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Dimensions, AppState, TouchableOpacity } from "react-native";
import { Accelerometer, Gyroscope, Magnetometer, DeviceMotion} from "expo-sensors";
import { SensorData } from "../utils/SensorData";
import { isRejectedWithValue } from "@reduxjs/toolkit";

import MadgwickFilter from "./MadgwickFilter";

const _freqUpdate = 50;
const beta = 0.1;

const accelerometerData = new SensorData();
const gyroscopeData = new SensorData();
const magnetometerData = new SensorData();

const rotationFilter = new MadgwickFilter(_freqUpdate, beta);

export default PDRApp = () => {
    const [devSub, setDevSub] = useState(null);

    const [deviceMotionData, setDeviceMotionData] = useState({
        acceleration: {},
        accelerationIncludingGravity: {},
        accelerationGravity: {},
        rotation: {},
        rotationRate: {}
    });

    const [start, setStart] = useState(false);
    const [clear, setClear] = useState(true);

    const [deviceOrientation, setDeviceOrientation] = useState(rotationFilter.getQuaternion());
    const isFirstRender = useRef(true);
    const isBufferFull = useRef([false, false, false]);

    const update = () => {
        rotationFilter.update(accelerometerData, gyroscopeData, magnetometerData);
        setDeviceOrientation(rotationFilter.getQuaternion());
        isBufferFull.current = [false, false, false];
        console.log(`---------- BUFFER RESET ----------`);
    }

    const _subscribe = () => {
        Promise.all([DeviceMotion.isAvailableAsync(), Gyroscope.isAvailableAsync(), Magnetometer.isAvailableAsync(), Accelerometer.isAvailableAsync()])
            .then(() => {
                console.log(`START SUBSCRIPTIONS`);
                DeviceMotion.setUpdateInterval(_freqUpdate);
                Gyroscope.setUpdateInterval(_freqUpdate);
                Magnetometer.setUpdateInterval(_freqUpdate);
                Accelerometer.setUpdateInterval(_freqUpdate);
                setStart(true);
                setClear(false);
                
                setDevSub(DeviceMotion.addListener((data) => {
                    setDeviceMotionData({acceleration: data.acceleration, 
                        accelerationIncludingGravity: data.accelerationIncludingGravity, 
                        accelerationGravity: {x: data.accelerationIncludingGravity.x - data.acceleration.x,
                            y: data.accelerationIncludingGravity.y - data.acceleration.y,
                            z: data.accelerationIncludingGravity.z - data.acceleration.z},
                        rotation: data.rotation, 
                        rotationRate: data.rotationRate});
                }));
                Accelerometer.addListener((data) => {
                    accelerometerData.setData(data);
                    isBufferFull.current[0] = true;
                    console.log(`ACC UPDATE`);
                    if(isBufferFull.current.every((v) => v == true)) {
                        update();
                    }
                });
                Gyroscope.addListener((data) => {
                    gyroscopeData.setData(data);
                    isBufferFull.current[1] = true;
                    console.log(`GYRO UPDATE`);
                    if(isBufferFull.current.every((v) => v == true)) {
                        update();
                    }
                })
                Magnetometer.addListener((data) => {
                    magnetometerData.setData(data);
                    isBufferFull.current[2] = true;
                    console.log(`MAG UPDATE`)
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
        devSub && devSub.remove();
        setDevSub(null);

        setStart(false);
        console.log('STOP SUBSCRIPTIONS');
    }

    const _clear = () => {
        _unsubscribe();

        setClear(true);
        setDeviceOrientation([1, 0, 0, 0]);
        setDeviceMotionData({
            acceleration: {},
            accelerationIncludingGravity: {},
            accelerationGravity: {},
            rotation: {},
            rotationRate: {}
        });
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
                <Text>Acceleration m/s^2</Text>
                <Text>x: {deviceMotionData.acceleration.x}</Text>
                <Text>y: {deviceMotionData.acceleration.y}</Text>
                <Text>z: {deviceMotionData.acceleration.z}</Text>
            </View>
            <View style={{ marginVertical: 15 }}>
                <Text>Acceleration Including Gravity m/s^2</Text>
                <Text>x: {deviceMotionData.accelerationIncludingGravity.x}</Text>
                <Text>y: {deviceMotionData.accelerationIncludingGravity.y}</Text>
                <Text>z: {deviceMotionData.accelerationIncludingGravity.z}</Text>
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
                <Text>x: {deviceMotionData.rotation.beta}</Text>
                <Text>y: {deviceMotionData.rotation.gamma}</Text>
                <Text>z: {deviceMotionData.rotation.alpha}</Text>
            </View>
            <View style={{ marginVertical: 15 }}>
                <Text>Rotation Rate deg/s</Text>
                <Text>x: {deviceMotionData.rotationRate.beta}</Text>
                <Text>y: {deviceMotionData.rotationRate.gamma}</Text>
                <Text>z: {deviceMotionData.rotationRate.alpha}</Text>
            </View>
            <View style={{ marginVertical: 15 }}>
                <Text>Device Quaternion {deviceOrientation[0]} {deviceOrientation[1]} {deviceOrientation[2]} {deviceOrientation[3]}</Text>
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