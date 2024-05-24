import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from "react-native";

// Import Canvas
// import Canvas from "react-native-canvas";
import { Canvas, Group, Circle, Skia, Path, Image, useImage } from "@shopify/react-native-skia";
// Import Sensor Related Libraries
import { Gyroscope, Magnetometer, DeviceMotion } from "expo-sensors";
import { SensorData } from "../utils/SensorData";

// Math Library
import * as math from "mathjs";

// File Manipulation Libraries
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
const { StorageAccessFramework } = FileSystem;

// Custom Modules 
import { Navigation } from "./Navigation";
import Animated, { useAnimatedProps, useAnimatedRef, useSharedValue } from "react-native-reanimated";
import { OccupancyMap, Particle } from "./ParticleFilter";

const _freqUpdate = 20; // 20 ms (50 hz) sample period (frequency) from motion sensors

const accelerometerData = new SensorData();
const accelerationWithoutGravity = new SensorData();
const gyroscopeData = new SensorData();
const magnetometerData = new SensorData();

const nav = new Navigation();

TIMESTAMP = Date.now();

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const PATH = Skia.Path.Make();
PATH.rMoveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/4);

// MAP


const occMap = new OccupancyMap();
occMap.initParticles();

export default PDRApp = () => {

    const [start, setStart] = useState(false);
    const [clear, setClear] = useState(true);
    const [deviceSub, setDeviceSub] = useState();

    const [newParticleUpdate, setNewParticleUpdate]= useState({})
    const dataBuffer = useRef([null, null, null, null]);
    const imageMap = useImage(require("../../assets/maps/TestMap.png"), (e) => {
        console.log(`IMAGE ERROR!!!!`)
    });

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
                    dataBuffer.current[0] = data.accelerationIncludingGravity;              // AccelerometerData in g
                    dataBuffer.current[1] = data.acceleration;                              // Accelerometer Data in m/s^2
                    if(dataBuffer.current.every((v) => math.isNull(v) == false)) {
                        update();                     
                    }
                }));

                Gyroscope.addListener((data) => {
                    dataBuffer.current[2] = data;                                           // Angle Velocity in 3-axis in rad/s
                    if(dataBuffer.current.every((v) => math.isNull(v) == false)) {
                        update();
                    }
                });

                Magnetometer.addListener((data) => {    
                    dataBuffer.current[3] = data;                                           // Magnetic Field Measurments in 3-axis, in uT         
                    if(dataBuffer.current.every((v) => math.isNull(v) == false)) {
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

        accelerometerData.clear();
        accelerationWithoutGravity.clear();
        gyroscopeData.clear();
        magnetometerData.clear();

        dataBuffer.current = [null, null, null, null];

        PATH.reset();
        PATH.rMoveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/4);

        setClear(true);
        nav.reset();
        occMap.clear();
    }

    const update = () => {
        // Set up dt for computations in Navigation
        let temp = Date.now();
        let dt = (temp - TIMESTAMP) / 1000 // in sec
        TIMESTAMP = temp;
        nav.setDt(dt);

        // Get Data from buffer
        accObj = dataBuffer.current[0];
        gyroObj = dataBuffer.current[2];
        magObj = dataBuffer.current[3];
        accWGObj = dataBuffer.current[1];

        // Clear buffer
        dataBuffer.current = [null, null, null, null];

        // Store Data in SensorData objects
        accelerometerData.pushData(accObj);
        accelerationWithoutGravity.pushData(accWGObj);

        gyroscopeData.pushData(gyroObj);
        magnetometerData.pushData(magObj);

        // Navigation
        let navResults = nav.runEKF(accWGObj, gyroObj);

        
        // Particle Filter

        // if(navResults.newStep) {
        //     let lastPosObj = {x: nav.POSITION_HISTORY.data.x.slice(-1), y: nav.POSITION_HISTORY.data.y.slice(-1)};
        //     handlePath(lastPosObj, false);
        // }

        if(navResults.newStep || navResults.newTurn) {
            console.log(`NAV ${JSON.stringify(navResults)}`)
            occMap.runParticleFilter(navResults.stepLength, navResults.deltaTh);
            setNewParticleUpdate({step: navResults.stepLength, turn: navResults.deltaTh})
        }
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
            {name: "acc", size: accelerometerData.x.length, data:{x: accelerometerData.x, y: accelerometerData.y, z: accelerometerData.z}}, 
            {name: "gyro", size: gyroscopeData.x.length, data:{x: gyroscopeData.x, y: gyroscopeData.y, z: gyroscopeData.z}},
            {name: "mag", size: magnetometerData.x.length, data:{x: magnetometerData.x, y: magnetometerData.y, z: magnetometerData.z}}, 
            // {name: "mag_rot", size: navEKF.xMagRotHistory.length, data:{x: navEKF.xMagRotHistory, y: navEKF.yMagRotHistory, z: navEKF.zMagRotHistory}}, 
            {name: "acc_wg", size: accelerationWithoutGravity.x.length, data:{x: accelerationWithoutGravity.x, y: accelerationWithoutGravity.y, z: accelerationWithoutGravity.z}},
            // {name: "acc_rot", size: navEKF.xAccRotHistory.length, data:{x: navEKF.xAccRotHistory, y: navEKF.yAccRotHistory, z: navEKF.zAccRotHistory}},
            // {name: "vel", size: navEKF.xVelHistory.length, data:{x: navEKF.xVelHistory, y: navEKF.yVelHistory}},
            {name: "pos", size: nav.POSITION_HISTORY.length(), data:{x: nav.POSITION_HISTORY.data.x, y: nav.POSITION_HISTORY.data.y}}, 
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
        // Clear Application
        _clear();

        setStart(true);
        // Opens Document Picker UI 
        let result = await DocumentPicker.getDocumentAsync({});
        // store Data from File
        console.log(JSON.stringify(result));
        if(!result.canceled) {
            const [accAssetObj, gyroAssetObj, magAssetObj, accWGAssetObj] = await FileSystem.readAsStringAsync(result.assets[0].uri).then((res) => JSON.parse(res));

            // Start Executing the Playback
            // Configure Sample Period 
            let samplePeriod = 1 / _freqUpdate;
            nav.setDt(samplePeriod);                // TO BE FIXED
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

                let updatePath = nav.runEKF(accWGObj, gyroObj, magObj);

                if(updatePath) {
                    let lastPosObj = {x: nav.POSITION_HISTORY.data.x.slice(-1), y: nav.POSITION_HISTORY.data.y.slice(-1)};
                    handlePath(lastPosObj, false);
                }
            }
            alert("Playback Finished");
        } else {
            alert("You must pick a file to play back.");
        }

        setStart(false);
        
    }

    const addStep = () => {
        nav.utilAddStep();
    }

    const removeStep = () => {
        nav.utilRemoveStep();
    }

    const turnRight = () => {
        nav.utilTurnRight();
    }

    const turnLeft = () => {
        nav.utilTurnLeft();
    }

    useEffect(() => {
        _subscribe();
        return _clear();
    }, []);

    return (
        <View style={styles.container}>
            <Text>PDR APP</Text>
            <Text>Running: {JSON.stringify(start)}</Text>
            <View style={{ marginVertical: 15}}>
                <Text>Sensor measurements: {accelerometerData.x.length}</Text>
            </View>

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
            <View>
                <Canvas style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT/2, marginVertical: 10}} mode='default'>
                    <Image 
                        image={imageMap} 
                        x={0}
                        y={0}
                        width={SCREEN_WIDTH} 
                        height={SCREEN_HEIGHT/2}
                        fit="scaleDown"
                    />
                    {new Array(occMap.particles.length).fill(0).map((v,i) => {
                        if(occMap.particles[i].weight) {
                            return(
                                <Circle 
                                    key={i}
                                    cx={occMap.particles[i].currPoint.x * SCREEN_WIDTH/occMap.width}
                                    cy={occMap.particles[i].currPoint.y * SCREEN_HEIGHT/(2*occMap.height)}
                                    r={2}
                                    color='red'   
                                />
                            )
                        }
                    })}
                    <Circle 
                        cx={occMap.userPos.x * SCREEN_WIDTH/occMap.width}
                        cy={occMap.userPos.y * SCREEN_HEIGHT/(2*occMap.height)}
                        r={8}
                        color='green'
                    />
                </Canvas>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={addStep} style={styles.button}>
                    <Text>+ Step</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={removeStep} style={styles.button}>
                    <Text>- Step</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={turnLeft} style={styles.button}>
                    <Text>+ 45°</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={turnRight} style={styles.button}>
                    <Text>- 45°</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 40,
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#081f41'
    },
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