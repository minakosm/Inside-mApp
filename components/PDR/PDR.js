import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Dimensions, AppState, TouchableOpacity, PermissionsAndroid } from "react-native";

// Import Sensor Related Libraries
import { Gyroscope, Magnetometer, DeviceMotion, MagnetometerUncalibrated} from "expo-sensors";
import { SensorData } from "../utils/SensorData";

// Math Library
import * as mathjs from "mathjs";

// File Manipulation Libraries
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
const { StorageAccessFramework } = FileSystem;

// Custom Modules 
import { AttitudeEstimator } from "./AttitudeEstimation";
import { NavigationEKF } from "./NavigationEKF";
import { nav3 } from "./nav3";
import { LineChart } from "react-native-chart-kit";

const _freqUpdate = 20; // 50 ms sample period from motion sensors

const accelerometerData = new SensorData();
const accelerationWithoutGravity = new SensorData();
const gyroscopeData = new SensorData();
const magnetometerData = new SensorData();

const attEst = new AttitudeEstimator();
const navEKF = new NavigationEKF()
const nav3EKF = new nav3();

TIMESTAMP = Date.now();
let _t = 0;
export default PDRApp = () => {

    const [start, setStart] = useState(false);
    const [clear, setClear] = useState(true);

    const [deviceSub, setDeviceSub] = useState();
    
    const [eulerAngles, setEulerAngles] = useState([0,0,0]);

    const isFirstRender = useRef(true);
    const isFirstCall = useRef(true);
    const dataBuffer = useRef([null, null, null, null]);

    const _subscribe = () => {
        Promise.all([DeviceMotion.isAvailableAsync(), Gyroscope.isAvailableAsync(), Magnetometer.isAvailableAsync()])
            .then(() => {
                console.log(`START SUBSCRIPTIONS`);
                TIMESTAMP = Date.now();      
                Gyroscope.setUpdateInterval(_freqUpdate);
                Magnetometer.setUpdateInterval(_freqUpdate);
                DeviceMotion.setUpdateInterval(_freqUpdate);
                setStart(true);
                setClear(false);


                setDeviceSub(DeviceMotion.addListener((data) => {

                    dataBuffer.current[0] = data.accelerationIncludingGravity;              
                    dataBuffer.current[1] = data.acceleration;                              
                    
                    if(dataBuffer.current.every((v) => mathjs.isNull(v) == false)) {
                        update();                     
                    }
                }));

                Gyroscope.addListener((data) => {

                    dataBuffer.current[2] = data;                                           // Angle Velocity in 3-axis in deg/s 
                    if(dataBuffer.current.every((v) => mathjs.isNull(v) == false)) {
                        update();
                    }
                });

                Magnetometer.addListener((data) => {    

                    dataBuffer.current[3] = data;                                           // Magnetic Field Measurments in 3-axis, in uT         
                    if(dataBuffer.current.every((v) => mathjs.isNull(v) == false)) {
                        update();
                    }
                })
                
            });     
    }

    const _unsubscribe = () => {
        Gyroscope.removeAllListeners();
        Magnetometer.removeAllListeners();
        deviceSub && deviceSub.remove();

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

        navEKF.reset();
        nav3EKF.reset();

        accelerometerData.clear();
        accelerationWithoutGravity.clear();
        gyroscopeData.clear();
        magnetometerData.clear();

        isFirstCall.current = true;
        isFirstRender.current = true;
        dataBuffer.current = [null, null, null, null];

    }

    const update = () => {
        // Set up dt for computations in Navigation
        let temp = Date.now();
        let dt = (temp - TIMESTAMP) / 1000 // in sec
        TIMESTAMP = temp;
        attEst.setSamplePeriod(dt);
        navEKF.setSamplePeriod(dt);

        // Get Data from buffer
        accObj = dataBuffer.current[0];
        gyroObj = dataBuffer.current[2];
        magObj = dataBuffer.current[3];
        accWGObj = dataBuffer.current[1];

        // Clear buffer
        dataBuffer.current = [null, null, null, null];

        if (navEKF.SamplePeriod < 0 ) { console.log(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`) ;} 

        // Store Data in SensorData objects
        accelerometerData.pushData(accObj);
        accelerationWithoutGravity.pushData(accWGObj);

        accelerationWithoutGravity.pushTimestamp(dt);
        accelerometerData.pushTimestamp(dt);

        gyroscopeData.pushData(gyroObj);
        magnetometerData.pushData(magObj);

        // Attitude Estimation Kalman Filter
        attEst.update(accObj, gyroObj, magObj);

        // Get rotations of smartphone Device
        // Refresh angles on Device
        setEulerAngles(attEst.getEulerAngles());

        let bodyToGlobal = attEst.getRotationMatrix();
        // Navigation Kalman Filter
        // navEKF.update(bodyToGlobal, accWGObj, gyroObj, magObj);
    }

    // Save Function to store localy a Data File from current Session
    const saveFile = async () => {

        let date = new Date();
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        // Check if permission granted
        if (permissions.granted) {
          // Get the directory uri that was approved
          let directoryUri = permissions.directoryUri;

          let DATA = [
            {name: "acc", size: accelerometerData.x.length, data:{x: accelerometerData.x, y: accelerometerData.y, z: accelerometerData.z}, timestamp: accelerometerData.t}, 
            {name: "gyro", size: gyroscopeData.x.length, data:{x: gyroscopeData.x, y: gyroscopeData.y, z: gyroscopeData.z}},
            {name: "mag", size: magnetometerData.x.length, data:{x: magnetometerData.x, y: magnetometerData.y, z: magnetometerData.z}}, 
            // {name: "mag_rot", size: navEKF.xMagRotHistory.length, data:{x: navEKF.xMagRotHistory, y: navEKF.yMagRotHistory, z: navEKF.zMagRotHistory}}, 
            {name: "acc_wg", size: accelerationWithoutGravity.x.length, data:{x: accelerationWithoutGravity.x, y: accelerationWithoutGravity.y, z: accelerationWithoutGravity.z}, timestamp: accelerationWithoutGravity.t},
            // {name: "acc_rot", size: navEKF.xAccRotHistory.length, data:{x: navEKF.xAccRotHistory, y: navEKF.yAccRotHistory, z: navEKF.zAccRotHistory}},
            // {name: "vel", size: navEKF.xVelHistory.length, data:{x: navEKF.xVelHistory, y: navEKF.yVelHistory}},
            // {name: "pos", size: navEKF.xPosHistory.length, data:{x: navEKF.xPosHistory, y: navEKF.yPosHistory}}, 
          ]

        const filename = date.getDate() + "_" + date.getMonth() + "_" + date.getFullYear() + "_" + date.getHours() + ":" + date.getMinutes();
          // Create file and pass it's SAF URI
          await StorageAccessFramework.createFileAsync(directoryUri, "data_" + filename, "application/json").then(async(fileUri) => {
            // Save data to newly created file
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(DATA), { encoding: FileSystem.EncodingType.UTF8 });
          })
          .catch((e) => {
            console.log(e);
          });
        } else {
          alert("You must allow permission to save.");
        }
      }

    // Playback Function designed to run tests from existing Data
    const playback  = async () => {
       
        let posMat = mathjs.matrix([[null, null, null]]);
        // Clear Application
        _clear();

        setStart(true);
        // Opens Document Picker UI 
        let result = await DocumentPicker.getDocumentAsync({});
        // store Data from File
        console.log(JSON.stringify(result));
        if(!result.canceled) {
            const [accAssetObj, gyroAssetObj, magAssetObj, , accWGAssetObj] = await FileSystem.readAsStringAsync(result.assets[0].uri).then((res) => JSON.parse(res));

            // Start Executing the Playback
            // Configure Sample Period 
            let samplePeriod = 1 / _freqUpdate;
            attEst.setSamplePeriod(samplePeriod);       // TO BE FIXED (fixed Sample Period)
            nav3EKF.setDt(samplePeriod);                // TO BE FIXED
            for(let i=0; i< accWGAssetObj.size; i++) {

                // Parse Data to Objects
                let accObj = {x: accAssetObj.data.x[i], y:accAssetObj.data.y[i], z: accAssetObj.data.z[i]};
                let accWGObj = {x: accWGAssetObj.data.x[i], y:accWGAssetObj.data.y[i], z:accWGAssetObj.data.z[i]};
                let gyroObj = {x: gyroAssetObj.data.x[i], y:gyroAssetObj.data.y[i], z: gyroAssetObj.data.z[i]};
                let magObj = {x: magAssetObj.data.x[i], y:magAssetObj.data.y[i], z: magAssetObj.data.z[i]};
                
                accelerometerData.pushData(accObj);
                accelerationWithoutGravity.pushData(accWGObj);
        
                gyroscopeData.pushData(gyroObj);
                magnetometerData.pushData(magObj);

                attEst.update(accWGObj, gyroObj, magObj);

                // navEKF.update(rotMat, accObj, gyroObj, magObj);

                nav3EKF.runEKF(accWGObj, gyroObj, magObj, attEst.getRotationMatrix());

                posMat = mathjs.concat(posMat, mathjs.transpose(nav3EKF.position));
            }

            console.log(posMat);
            alert("Playback Finished");
        } else {
            alert("You must pick a file to play back.");
        }

        setStart(false);
        
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
            <View style={{ marginVertical: 15}}>
                <Text>Sensor measurements: {accelerometerData.x.length}</Text>
            </View>
            { <View style={{ marginVertical: 15 }}>
                <Text>Orientation</Text>
                <Text>roll: {eulerAngles[2].toFixed(3)}</Text>
                <Text>pitch: {eulerAngles[1].toFixed(3)}</Text>
                <Text>yaw: {eulerAngles[0].toFixed(3)}</Text>
            </View> }
            {/* <View style = {{marginVertical: 10}}>
            <Text>Step Count : {navEKF.stepCount}</Text>

            <Text>Step Length</Text>
            <Text>sum: {JSON.stringify(mathjs.sum(navEKF.stepLength))}</Text>
            </View>
            <View style={{ marginVertical: 15}}>
                <Text>Position measurements: {navEKF.xPosHistory.length}</Text>
                <Text>x: {navEKF.xPosHistory[navEKF.xPosHistory.length-1].toFixed(3)} y: {navEKF.yPosHistory[navEKF.yPosHistory.length-1].toFixed(3)}</Text>
            </View> */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={start ? _unsubscribe : _subscribe} style={styles.button}>
                    <Text style={start? {color: 'red'} : {color: 'green'}}>{!start ? 'START' : 'STOP'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveFile} style={styles.button}>
                    <Text>{'SAVE'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={_clear} style={styles.button}>
                    <Text>{'CLEAR'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={playback} style={styles.button}>
                    <Text>{"PLAYBACK"}</Text>
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
        padding: 10,
    },
    button: {
        marginHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderStyle: 'solid',
        borderWidth: 1,
        flex: 1,
        width: 40,
        height: 40,
        elevation: 5
    },
});