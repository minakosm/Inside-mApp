import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Dimensions, AppState, TouchableOpacity, PermissionsAndroid, Alert } from "react-native";

// Import Canvas
// import Canvas from "react-native-canvas";
import { Canvas, Group, Circle, Rect, Skia, Path, useValue, useComputedValue, PathVerb } from "@shopify/react-native-skia";

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
import { nav3 } from "./nav3";

const _freqUpdate = 20; // 50 ms sample period from motion sensors

const accelerometerData = new SensorData();
const accelerationWithoutGravity = new SensorData();
const gyroscopeData = new SensorData();
const magnetometerData = new SensorData();

const nav3EKF = new nav3();

TIMESTAMP = Date.now();

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const PATH = Skia.Path.Make();
PATH.rMoveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/4);
export default PDRApp = () => {

    const [start, setStart] = useState(false);
    const [clear, setClear] = useState(true);
    const [deviceSub, setDeviceSub] = useState();
    const [pathTrHistory, setPathTrHistory] = useState(new Array());

    const [heading, setHeading] = useState(0);

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

                    dataBuffer.current[0] = data.accelerationIncludingGravity;              // AccelerometerData in g
                    dataBuffer.current[1] = data.acceleration;                              // Accelerometer Data in m/s^2
                    
                    if(dataBuffer.current.every((v) => math.isNull(v) == false)) {
                        update();                     
                    }
                }));

                Gyroscope.addListener((data) => {

                    dataBuffer.current[2] = data;                                           // Angle Velocity in 3-axis in deg/s !!!!!!!!!!!!!!!MAYBE RAD/S!!!!!!!!!!!!!!!
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

        pathTransformation.current = ([
            {scaleX: 1},
            {scaleY: 1},
            {translateX: 0},
            {translateY: 0}
        ]);
        
        SQUARES_AMOUNT_HORIZONTAL.current = math.floor(sc/pathTransformation.current[0].scaleX);
        SQUARES_AMOUNT_VERTICAL.current = math.floor(sc/pathTransformation.current[1].scaleY);
        SQUARE_CONTAINER_SIZE.current = SCREEN_WIDTH / SQUARES_AMOUNT_HORIZONTAL.current;
        SQUARE_SIZE.current = SQUARE_CONTAINER_SIZE.current - 0.5;

        PATH.reset();
        PATH.rMoveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/4);

        setHeading(0);
        setPathTrHistory(new Array());
        setClear(true);
        nav3EKF.reset();
    }

    const update = () => {
        // Set up dt for computations in Navigation
        let temp = Date.now();
        let dt = (temp - TIMESTAMP) / 1000 // in sec
        TIMESTAMP = temp;
        nav3EKF.setDt(dt);

        // Get Data from buffer
        accObj = dataBuffer.current[0];
        gyroObj = dataBuffer.current[2];
        magObj = dataBuffer.current[3];
        accWGObj = dataBuffer.current[1];

        // Clear buffer
        dataBuffer.current = [null, null, null, null];

        if (nav3EKF.SamplePeriod < 0 ) { console.log(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`) ;} 

        // Store Data in SensorData objects
        accelerometerData.pushData(accObj);
        accelerationWithoutGravity.pushData(accWGObj);

        gyroscopeData.pushData(gyroObj);
        magnetometerData.pushData(magObj);

        // Navigation Kalman Filter
        let updatePath = nav3EKF.runEKF(accWGObj, gyroObj, magObj);

        if(updatePath) {
            let lastPosObj = {x: nav3EKF.POSITION_HISTORY.data.x.slice(-1), y: nav3EKF.POSITION_HISTORY.data.y.slice(-1)};
            handlePath(lastPosObj, false);
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
            {name: "pos", size: nav3EKF.POSITION_HISTORY.length(), data:{x: nav3EKF.POSITION_HISTORY.data.x, y: nav3EKF.POSITION_HISTORY.data.y}}, 
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

                let updatePath = nav3EKF.runEKF(accWGObj, gyroObj, magObj);

                if(updatePath) {
                    let lastPosObj = {x: nav3EKF.POSITION_HISTORY.data.x.slice(-1), y: nav3EKF.POSITION_HISTORY.data.y.slice(-1)};
                    handlePath(lastPosObj, false);
                }
            }
            alert("Playback Finished");
        } else {
            alert("You must pick a file to play back.");
        }

        setStart(false);
        
    }

    const pathTransformation = useValue([
        {scaleX: 1},
        {scaleY: 1},
        {translateX: 0},
        {translateY: 0}
    ]);
    let sc = 5;
    const MARGIN = 50;

    //GRID 
    const SQUARES_AMOUNT_HORIZONTAL = useComputedValue(() => {
        return math.floor(sc/pathTransformation.current[0].scaleX);
    }, [pathTransformation]);

    const SQUARES_AMOUNT_VERTICAL = useComputedValue(() => {
        return math.floor(sc/pathTransformation.current[1].scaleY);
    },[pathTransformation]);

    const SQUARE_CONTAINER_SIZE = useComputedValue(() => {
        return SCREEN_WIDTH / SQUARES_AMOUNT_HORIZONTAL.current;
    },[SQUARES_AMOUNT_HORIZONTAL.current])

    const SQUARE_SIZE = useComputedValue(() => {
        return SQUARE_CONTAINER_SIZE.current - 0.5;
    }, [SQUARE_CONTAINER_SIZE.current]);


    const handlePath = (lastPosObj, remove) => {
        // Scale Pixels/Meters 
        if(remove) { 
            if(PATH.countPoints() == 1) {return;}
            let cmds = PATH.toCmds();
            cmds.pop();
            cmds[0] = [0, SCREEN_WIDTH/2, SCREEN_HEIGHT/4];
            let tempPath = Skia.Path.MakeFromCmds(cmds);
            PATH.reset();
            PATH.addPath(tempPath);
            cmds = PATH.toCmds();
            for(c in cmds) {
                console.log(`IN REMOVE \t${c} \t ${cmds[c]}\n`);
            }

            console.log(`PATH POINTS = \t ${PATH.countPoints()}`);

            
            setPathTrHistory(() => {
                if(pathTrHistory.length==1) {return pathTrHistory}
                pathTrHistory.pop();
                return [...pathTrHistory]
            })
            pathTransformation.current = pathTrHistory.at(-1);
            return;
        } else {

            let Wscale = SCREEN_WIDTH / sc;
            let Hscale = SCREEN_HEIGHT / (2 * sc);

            let px = lastPosObj.x * Wscale;
            let py = lastPosObj.y * Hscale;
            PATH.lineTo(SCREEN_WIDTH/2 + px, SCREEN_HEIGHT/4 - py);

            console.log(`=======================================`);

            let {x: xBound, y: yBound, width: wBound, height: hBound} = PATH.getBounds();
            let {x: xLast, y: yLast} = PATH.getLastPt();
            let commands = PATH.toCmds();

            console.log(`BOUNDS = {x: ${xBound} , y: ${yBound}}`);
            console.log(`BOUNDS = {w: ${wBound} , h: ${hBound}}`);
            console.log(`LAST = {x: ${xLast} , y: ${yLast}}`);

            console.log(`=======================================`);

            let scX = pathTransformation.current[0].scaleX;
            let scY = pathTransformation.current[1].scaleY;
            let trX = pathTransformation.current[2].translateX;
            let trY = pathTransformation.current[3].translateY; 

            // SCALING
            if(wBound > SCREEN_WIDTH - MARGIN) {scX = SCREEN_WIDTH/(wBound + MARGIN);}
            if(hBound > SCREEN_HEIGHT/2 - MARGIN) {scY = SCREEN_HEIGHT/(2*hBound + MARGIN);}

            // TRANSLATING

            // PATH BOUNDARIES 
            let TOP = yBound;
            let LEFT = xBound;
            let BOT = yBound + hBound;
            let RIGHT = xBound + wBound;

            // WORLD BOUNDARIES 
            let W_TOP = -trY * scY;
            let W_LEFT = -trX * scX;
            let W_BOT = (SCREEN_HEIGHT/4 - trY) * scY;
            let W_RIGHT = (SCREEN_WIDTH/2 - trX) * scX;

            // Translate the Path Boundaries Center to Canvas Center

            trX = SCREEN_WIDTH/2 - xBound - wBound/2;
            trY = SCREEN_HEIGHT/4 - yBound - hBound/2;

            pathTransformation.current = [
                {scaleX: scX},
                {scaleY: scY},
                {translateX: trX},
                {translateY: trY}
            ];

            setPathTrHistory([...pathTrHistory, pathTransformation.current]);
        }
    }

    const addStep = () => {
        nav3EKF.utilAddStep();
        handlePath({x: nav3EKF.POSITION_HISTORY.data.x.at(-1), y: nav3EKF.POSITION_HISTORY.data.y.at(-1)}, false);
    }

    const removeStep = () => {
        nav3EKF.utilRemoveStep();
        handlePath(null, true);
    }

    const turnRight = () => {
        nav3EKF.utilTurnRight();
        setHeading(math.round(nav3EKF.quaternion2rpy(nav3EKF.lastStepAtt)[2] * (180/ Math.PI)))
    }

    const turnLeft = () => {
        nav3EKF.utilTurnLeft();
        setHeading(math.round(nav3EKF.quaternion2rpy(nav3EKF.lastStepAtt)[2] * (180/ Math.PI)))
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
                <Canvas style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT/2, marginVertical: 10}}>
                    {/* <Group>
                        {new Array(SQUARES_AMOUNT_HORIZONTAL.current).fill(0).map((_, i) =>  {
                            return new Array(SQUARES_AMOUNT_VERTICAL.current).fill(0).map((_, j)  => {
                                return <Rect 
                                    key={`(${i} , ${j})`}
                                    x = {i * SQUARE_CONTAINER_SIZE.current - pathTransformation.current[2].translateX}
                                    y = {j * SQUARE_CONTAINER_SIZE.current - pathTransformation.current[3].translateY}
                                    width = {SQUARE_SIZE.current}
                                    height = {SQUARE_SIZE.current}
                                    color='white'
                                    transform={pathTransformation}
                                />
                            })
                        })}
                    </Group> */}
                    <Rect
                        x={0}
                        y={0}
                        width={SCREEN_WIDTH}
                        height={SCREEN_HEIGHT/2}
                        color='white'
                    />
                    <Group>
                        <Path
                            path={PATH}
                            color="darkblue"
                            style="stroke"
                            strokeWidth={10 /(math.mean(pathTransformation.current[0].scaleX, pathTransformation.current[1].scaleY))}
                            origin={{x: SCREEN_WIDTH/2, y: SCREEN_HEIGHT/4}}
                            transform={pathTransformation}
                        />
                        <Circle 
                            cx={SCREEN_WIDTH/2}
                            cy={SCREEN_HEIGHT/4}
                            r={10}
                            color={'green'}
                            origin={{x:SCREEN_WIDTH/2, y:SCREEN_HEIGHT/4}}
                            transform={pathTransformation}
                        />
                    </Group>
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

            <View>
                <Text>Current Heading {heading}°</Text>
                <Text>Total Steps {PATH.countPoints() -1 }</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 40,
        flex: 1,
        alignItems: 'center',
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