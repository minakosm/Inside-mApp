import React, { useState, useEffect, useRef, Component } from "react";
import { StyleSheet, Text, View, Dimensions, TouchableHighlight, Alert, ScrollView, TextInput, TextInputComponent, SafeAreaView, } from "react-native";

// Import Canvas
// import Canvas from "react-native-canvas";
import { Canvas, Group, Circle, Skia, Rect, useImage, Image, ImageSVG, useImageAsTexture, loadData } from "@shopify/react-native-skia";
// Import Sensor Related Libraries
import { Gyroscope, DeviceMotion, Accelerometer} from "expo-sensors";
import { SensorData } from "../utils/SensorData";

// Math Library
import * as math from "mathjs";

// File Manipulation Libraries
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
const { StorageAccessFramework } = FileSystem;


// Custom Modules 
import { PedestrianDeadReckoning } from "../PDR/PedestrianDeadReckoning";
import Animated, { interpolateColor, runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedRef, useAnimatedSensor, useSharedValue } from "react-native-reanimated";
import { OccupancyMap, Particle } from "../PDR/ParticleFilter";

// Gestures
import { GestureHandlerRootView, GestureDetector, Gesture } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

const _freqUpdate = 20; // 20 ms (50 hz) sample period (frequency) from motion sensors

const accelerometerData = new SensorData();
const accelerationWithoutGravity = new SensorData();
const gyroscopeData = new SensorData();

const pdr = new PedestrianDeadReckoning();

const  LOCATION_DATA = [];
TIMESTAMP = Date.now();
let tmpT;

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const PATH = Skia.Path.Make();
PATH.rMoveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/4);
// MAP
let occMap = new OccupancyMap();
//occMap.initParticles();
const svg = Skia.SVG.MakeFromString(
    `<svg data-name="1-Arrow Up" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <path d="m26.71 10.29-10-10a1 1 0 0 0-1.41 0l-10 10 1.41 1.41L15 3.41V32h2V3.41l8.29 8.29z"/>
    </svg>`
);

export default Navigation = (props) => {

    const [start, setStart] = useState(false);
    const [clear, setClear] = useState(true);

    const [deviceSub, setDeviceSub] = useState(null);
    const [gyroSub, setGyroSub] = useState(null)

    const [newParticleUpdate, setNewParticleUpdate]= useState({
        step: null, 
        turn: null
    })
    // const [occMap, setOccMap] = useState(new OccupancyMap());
    const [mapImageName, setMapImageName] = useState(" ");    
    const [mapPicked, setMapPicked] = useState(false);
    
    const dataBuffer = useRef([null, null, null, null]);
    
    const userTapPos = useSharedValue({
        x: 0,
        y: 0
    });

    function DeviceMotionCallback(data){
        if(!Object.keys(data).find((k) => k ==='accelerationIncludingGravity' || k === 'acceleration')) {return;}
        dataBuffer.current[0] = data.accelerationIncludingGravity;              // AccelerometerData in g
        dataBuffer.current[1] = data.acceleration;
        dataBuffer.current[3] = data.interval;                              // Accelerometer Data in m/s^2
        if(dataBuffer.current.every((v) => v !== null)) {
            update();                     
        }
    }

    function GyroscopeCallback(data){
        dataBuffer.current[2] = data;   
        if(dataBuffer.current.every((v) => v !== null)) {
            update();
        }    
    }

    const mapPicker = async () => {
        occMap.clear()
        // Open Document Picker and choose File
        let result = await DocumentPicker.getDocumentAsync({});
        // If file picked succesfully
        if(!result.canceled) {
            // Get map Data
            const {binaryMap, size, resolution, imageName, extension} = await FileSystem.readAsStringAsync(result.assets[0].uri).then((res) => JSON.parse(res));
            let occupancyGrid = math.matrix(binaryMap);
            occMap = new OccupancyMap(occupancyGrid, resolution);
            setMapImageName(imageName);
            setMapPicked(true)
        } else {
            alert("Pick a Map File");
        }
    }

    const tapGesture = Gesture.Tap()
            .maxDuration(250)
            .numberOfTaps(2)
            .onStart((e) => {
                userTapPos.value = { x: e.x, y: e.y };
                runOnJS(setInitPos)(e.x, e.y);
            });
    
    const panGesture = Gesture.Pan()
            .activateAfterLongPress(250)
            .onUpdate((e) => {
                // console.log(`PAN UPDATE ${e.translationX} ${e.translationY}`);
                
               runOnJS(angleLog)(-e.translationX, -e.translationY);
            })
            .onEnd((e) => {
                runOnJS(setInitHeading)(-e.translationX, -e.translationY);
            })
    
    const simulGesture = Gesture.Simultaneous(tapGesture, panGesture);

    function angleLog(y, x) {
        console.log(`PAN HEADING ${math.atan2(y, x) * 180/math.pi}`)
    }; 

    function setInitPos(pxX, pxY) {
        let userX = pxX/SCREEN_WIDTH * occMap.xWorldLimits;
        let userY = 2*pxY/SCREEN_HEIGHT * occMap.yWorldLimits;
        if(occMap.isInsideWall(
            {currPoint: {
                x: userX,
                y: userY
            }}
        )) {
            alert(`Can't start from Occupied Space! Try again`);
            return;
        }
        
        occMap.setEstimatedPos(userX, userY);
        occMap.initParticles();
        setNewParticleUpdate({
            step: 0,
            turn: 0
        });
    }

    function setInitHeading(y, x) {
        if(!math.isNumber(occMap.estimatedPos.x) || !math.isNumber(occMap.estimatedPos.y)) {
            alert("No user position found!")
            return;
        }
        let theta = math.atan2(y, x) * 180/math.pi;
        occMap.setEstimatedHeading(theta);
        occMap.initParticles();
        setNewParticleUpdate({
            step: 0,
            turn: 0
        });
    }

    const _subscribe = () => {
        Promise.all([Accelerometer.isAvailableAsync(), DeviceMotion.isAvailableAsync(), Gyroscope.isAvailableAsync()])
            .then(() => {
                console.log(`START SUBSCRIPTIONS`);
                TIMESTAMP = Date.now();      
                Gyroscope.setUpdateInterval(_freqUpdate);
                DeviceMotion.setUpdateInterval(_freqUpdate);
                setStart(true);
                setClear(false);

                setDeviceSub(DeviceMotion.addListener(DeviceMotionCallback));
                setGyroSub(Gyroscope.addListener(GyroscopeCallback));

            });     
    }

    const _unsubscribe = () => {
        gyroSub && gyroSub.remove();
        deviceSub && deviceSub.remove();
        setDeviceSub(null);
        setGyroSub(null);
        
        setStart(false);
        console.log('STOP SUBSCRIPTIONS');
    }

    const _clear = () => {
        _unsubscribe();

        accelerometerData.clear();
        accelerationWithoutGravity.clear();
        gyroscopeData.clear();

        userTapPos.value = {x:null, y:null};
        PATH.reset();
        PATH.rMoveTo(SCREEN_WIDTH/2, SCREEN_HEIGHT/4);

        LOCATION_DATA.splice(0, LOCATION_DATA.length);

        setClear(true);
        setNewParticleUpdate({
            step: null,
            turn: null
        })
        pdr.reset();
        occMap.clear();
    }

    const update = async () => {
        // Set up dt for computations in Navigation
        let temp = Date.now();
        let dt = (temp - TIMESTAMP) / 1000 // in sec
        TIMESTAMP = temp;
        pdr.setDt(dt);
        // console.log(JSON.stringify(dataBuffer.current))
        // Get Data from buffer
        accObj = dataBuffer.current[0];
        accWGObj = dataBuffer.current[1];        
        gyroObj = dataBuffer.current[2];
        tmpT = dataBuffer.current[3];

        // Store Data in SensorData objects
        accelerometerData.pushData(accObj);
        accelerationWithoutGravity.pushData(accWGObj);
        gyroscopeData.pushData(gyroObj);
        // Navigation
        let pdrResults = pdr.runEKF(accWGObj, gyroObj);

        // Particle Filter

        // if(navResults.newStep) {
        //     let lastPosObj = {x: pdr.POSITION_HISTORY.data.x.slice(-1), y: pdr.POSITION_HISTORY.data.y.slice(-1)};
        //     handlePath(lastPosObj, false);
        // }

        if(pdrResults.newStep || pdrResults.newTurn || !occMap.isPFInitialized()) {
            await occMap.runParticleFilter(pdrResults.stepLength, pdrResults.deltaTh).then((res) =>{
                LOCATION_DATA.push({
                    x: occMap.estimatedPos.x,
                    y: occMap.estimatedPos.y,
                    t: tmpT, 
                })
                // console.log(LOCATION_DATA);
                setNewParticleUpdate({step: pdrResults.stepLength, turn: pdrResults.deltaTh})
            });
        }
        // Clear buffer
        dataBuffer.current = [null, null, null, null];
    }

    // Save Function to store localy a Data File from current Session
    const saveFile = async () => {

        let date = new Date();
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        // Check if permission granted
        if (permissions.granted) {
          // Get the directory uri that was approved
          let directoryUri = permissions.directoryUri;

          let DATA = [{
            acc: {
                x: accelerationWithoutGravity.x,
                y: accelerationWithoutGravity.y,
                z: accelerationWithoutGravity.z,
            },
            gyro: {
                x: gyroscopeData.x,
                y: gyroscopeData.y,
                z: gyroscopeData.z,
            },
            locations: LOCATION_DATA
          }];
        //   let DATA = [
        //     {name: "acc", size: accelerometerData.x.length, data:{x: accelerometerData.x, y: accelerometerData.y, z: accelerometerData.z}}, 
        //     {name: "gyro", size: gyroscopeData.x.length, data:{x: gyroscopeData.x, y: gyroscopeData.y, z: gyroscopeData.z}},
        //     // {name: "mag_rot", size: navEKF.xMagRotHistory.length, data:{x: navEKF.xMagRotHistory, y: navEKF.yMagRotHistory, z: navEKF.zMagRotHistory}}, 
        //     {name: "acc_wg", size: accelerationWithoutGravity.x.length, data:{x: accelerationWithoutGravity.x, y: accelerationWithoutGravity.y, z: accelerationWithoutGravity.z}},
        //     // {name: "acc_rot", size: navEKF.xAccRotHistory.length, data:{x: navEKF.xAccRotHistory, y: navEKF.yAccRotHistory, z: navEKF.zAccRotHistory}},
        //     // {name: "vel", size: navEKF.xVelHistory.length, data:{x: navEKF.xVelHistory, y: navEKF.yVelHistory}},
        //     {name: "pos", size: pdr.POSITION_HISTORY.length(), data:{x: pdr.POSITION_HISTORY.data.x, y: pdr.POSITION_HISTORY.data.y}}, 
        //   ]

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
            const [accAssetObj, gyroAssetObj, , accWGAssetObj] = await FileSystem.readAsStringAsync(result.assets[0].uri).then((res) => JSON.parse(res));

            // Start Executing the Playback
            // Configure Sample Period 
            let samplePeriod = 1 / _freqUpdate;
            pdr.setDt(samplePeriod);                // TO BE FIXED
            for(let i=0; i< accWGAssetObj.size; i++) {

                // Parse Data to Objects
                let accObj = {x: accAssetObj.data.x[i], y:accAssetObj.data.y[i], z: accAssetObj.data.z[i]};
                let accWGObj = {x: accWGAssetObj.data.x[i], y:accWGAssetObj.data.y[i], z:accWGAssetObj.data.z[i]};
                let gyroObj = {x: gyroAssetObj.data.x[i], y:gyroAssetObj.data.y[i], z: gyroAssetObj.data.z[i]};
        
                accelerometerData.pushData(accObj);
                accelerationWithoutGravity.pushData(accWGObj);
        
                gyroscopeData.pushData(gyroObj);     

                let updatePath = pdr.runEKF(accWGObj, gyroObj, magObj);

                if(updatePath) {
                    let lastPosObj = {x: pdr.POSITION_HISTORY.data.x.slice(-1), y: pdr.POSITION_HISTORY.data.y.slice(-1)};
                    handlePath(lastPosObj, false);
                }
            }
            alert("Playback Finished");
        } else {
            alert("You must pick a file to play back.");
        }

        setStart(false);
        
    }

    const addStep = async() => {
        if(newParticleUpdate.step === null) {
            alert(`Unable to Add Step!`)
            return;
        }
        await occMap.runParticleFilter(0.6, 0);
        LOCATION_DATA.push({
            x: occMap.estimatedPos.x,
            y: occMap.estimatedPos.y,
            t: tmpT, 
        })
        setNewParticleUpdate({step: 0.6, turn: newParticleUpdate.turn})
        
    }

    const removeStep = async () => {
        if(newParticleUpdate.step === null || newParticleUpdate.step === 0) {
            alert(`Unable to Remove Step!`)
            return;
        }
        await occMap.runParticleFilter(-math.abs(newParticleUpdate.step), 0);
        setNewParticleUpdate({step: -newParticleUpdate.step, turn: newParticleUpdate.turn})
    }

    const turnRight = async () => {
        if(newParticleUpdate.turn === null || !math.isNumber(occMap.estimatedPos.x) || !math.isNumber(occMap.estimatedPos.y)) {
            alert(`Unable to Change Heading!`);
            return;
        }
        await occMap.runParticleFilter(0, -45);
        setNewParticleUpdate({step: newParticleUpdate.step, turn: -45});
    }

    const turnLeft = async () => {
        if(newParticleUpdate.turn === null || !math.isNumber(occMap.estimatedPos.x) || !math.isNumber(occMap.estimatedPos.y)) {
            alert(`Unable to Change Heading!`);
            return;
        }
        await occMap.runParticleFilter(0, 45);
        setNewParticleUpdate({step: newParticleUpdate.step, turn: 45});
    }

    function welcomeScreen() {
        return(
            <View style={{marginVertical: '85%'}}>
                <View style={styles.dataContainerMiddle}>
                <TouchableHighlight style={styles.button}>
                    <Text style={styles.buttonText} onPress={mapPicker}> Let's Get Started !</Text>
                </TouchableHighlight>
                </View>
            </View>
        )
    }

    const ImageItem = ({name}) => {
        let SkiaImage;
        switch (name) {
            case "testMap":
                SkiaImage = useImage(require("../../assets/maps/testMap.png"));
                break;
            case "labMap":
                SkiaImage = useImage(require("../../assets/maps/labMap.png"));
                break;
            default:
                SkiaImage = useImage(require("../../assets/icon.png"));
            break;
        }
        return (
            <Image 
            image={SkiaImage}
            x={0}
            y={0}
            width={SCREEN_WIDTH} 
            height={SCREEN_HEIGHT/2}
            fit='fill'
            />
        );
    }
    useEffect(() => {

    }, [mapPicked, start, clear, newParticleUpdate]);

    return !mapPicked? welcomeScreen() : (
        <SafeAreaView>
        <View style={styles.container}>
            <ScrollView>
            <View style={[styles.dataContainerMiddle, {marginTop: '15%'}]}>
            <TouchableHighlight onPress={start ? _unsubscribe : _subscribe} style={styles.button}>
                <Text style={styles.buttonText}>{!start ? 'START' : 'STOP'}</Text>
            </TouchableHighlight>
            <TouchableHighlight onPress={saveFile} style={styles.button}>
                <Text style={styles.buttonText}>{'SAVE'}</Text>
            </TouchableHighlight>
            <TouchableHighlight onPress={_clear} style={styles.button}>
                <Text style={styles.buttonText}>{'CLEAR'}</Text>
            </TouchableHighlight>
            <TouchableHighlight onPress={playback} style={styles.button}>
                <Text style={styles.buttonText}>{"PLAYBACK"}</Text>
            </TouchableHighlight>
            </View>

            <View style={{marginVertical:10}}>
            <GestureHandlerRootView style={{flex: 1}}>
                <GestureDetector gesture={simulGesture}>
                    <Canvas style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT/2}} mode='default'>
                        <ImageItem name={mapImageName}/>
                        {new Array(occMap.particles.length).fill(0).map((v,i) => {
                            if(occMap.particles[i].weight) {
                                return(
                                    <Circle 
                                        key={i}
                                        cx={(occMap.particles[i].currPoint.x/occMap.xWorldLimits) * SCREEN_WIDTH}
                                        cy={(occMap.particles[i].currPoint.y/occMap.yWorldLimits) * (SCREEN_HEIGHT/2)}
                                        r={2}
                                        color='red'
                                    />
                                )
                            }
                        })}
                        {new Array(1).fill(0).map((v,i) => {
                            if(occMap.estimatedPos.x !== null || occMap.estimatedPos.y !== null) {
                                return (
                                    <Group 
                                    origin={{x: (occMap.estimatedPos.x/occMap.xWorldLimits) * SCREEN_WIDTH, y: (occMap.estimatedPos.y/occMap.yWorldLimits) * (SCREEN_HEIGHT/2)}}
                                    transform = {[{ rotateZ: -occMap.estimatedPos.heading * math.pi/180 }]}>
                                        <Circle
                                        key={`Circle`}
                                        cx={(occMap.estimatedPos.x/occMap.xWorldLimits) * SCREEN_WIDTH}
                                        cy={(occMap.estimatedPos.y/occMap.yWorldLimits) * (SCREEN_HEIGHT/2)}
                                        r={6}
                                        color='blue'
                                    />
                                    <ImageSVG 
                                        key={'SVG'}
                                        svg={svg}
                                        x={(occMap.estimatedPos.x/occMap.xWorldLimits) * (SCREEN_WIDTH) - 10}
                                        y={(occMap.estimatedPos.y/occMap.yWorldLimits) * (SCREEN_HEIGHT/2) - 20}
                                        width={20}
                                        height={20}
                                    />
                                    </Group>
                                )
                            }
                        })}         
                    </Canvas>
                </GestureDetector>
            </GestureHandlerRootView>
            </View>

            <View style={{marginTop:5}}>
                <View style={styles.dataContainerMiddle}>
                    <TouchableHighlight onPress={addStep} style={styles.button}>
                        <Text style={styles.buttonText}>+ Step</Text>
                    </TouchableHighlight>
                    <TouchableHighlight onPress={removeStep} style={styles.button}>
                        <Text style = {styles.buttonText}>- Step</Text>
                    </TouchableHighlight>
                    <TouchableHighlight onPress={turnLeft} style={styles.button}>
                        <Text style={styles.buttonText}>+ 45°</Text>
                    </TouchableHighlight>
                    <TouchableHighlight onPress={turnRight} style={styles.button}>
                        <Text style={styles.buttonText}>- 45°</Text>
                    </TouchableHighlight>
                </View>
            </View>

            <View style={{marginTop:10}}>
                <View style={styles.dataContainerMiddle}>
                    <View style={{flexDirection:'column', marginHorizontal:10, justifyContent:'space-evenly'}}>
                        <Text style={styles.inputText}> n-Particles </Text>
                        <TextInput 
                            key={"N-particles"}
                            value={JSON.stringify(occMap.getNrOfParticles())}
                            style={styles.input}
                            onChangeText={(e) =>{ 
                                isNaN(parseInt(e,10))? occMap.setNrOfParticles(10) : occMap.setNrOfParticles(parseInt(e,10));
                                _clear();
                            }}
                            inputMode="numeric"
                        />
                        <Text style={styles.inputText}> k-Best </Text>
                        <TextInput 
                            key={"kBest"}
                            value={JSON.stringify(occMap.getK())}
                            style={styles.input}
                            onChangeText={(e) =>{ 
                                isNaN(parseInt(e,10))? occMap.setK(1) : occMap.setK(parseInt(e,10));
                                _clear();
                            }}
                            inputMode="numeric"
                        />
                    </View>

                </View>
            </View>
            <View style={styles.dataContainerMiddle}>
                <View style={{marginTop:10, flex:1, alignContent:'center'}}>
                    <Text style={{color:'#007'}} onPress={()=>{setMapPicked(false)}}>HomeScreen</Text>
                </View>
            </View>
            
            </ScrollView>
        </View>
        </SafeAreaView>
    );

}

// const styles = StyleSheet.create({
//     container: {
//         marginVertical: 40,
//         flex: 1,
//         alignItems: 'center',
//         backgroundColor: '#081f41'
//     },
//     buttonContainer: {
//         alignItems: 'center',
//         justifyContent: 'center',
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//         padding: 10,
//     },
//     button: {
//         marginHorizontal: 10,
//         alignItems: 'center',
//         justifyContent: 'center',
//         borderRadius: 20,
//         borderStyle: 'solid',
//         borderWidth: 1,
//         flex: 1,
//         width: 40,
//         height: 40,
//         elevation: 5
//     },
// });

const styles = StyleSheet.create({
    logo: {
        width: "50%",
        height: 100
    },
    navigationIcons: {
        height: 23
    },
    container: {
        alignItems: 'center'
    },
    externalContainer: {
        flex: 1,
        backgroundColor: "#081f41",
        justifyContent: 'center',
    },
    button: {
        marginHorizontal: 10,
        marginBottom: 15,
        backgroundColor: '#344763',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderStyle: 'solid', borderColor: "black",
        flex: 1,
        width: 40,
        height: 40,
        elevation: 5
    },
    buttonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    dataContainerMiddle: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: 10,
        backgroundColor: "transparent",
        padding: 3,
    },
    input: {
        borderWidth: 1,
        paddingVertical: 3,
        width: "auto",
        textAlign: 'center',
        height: 30
      },
      inputText: {
        marginRight: 6,
        fontSize: 14,
        fontWeight:'heavy',
      },
    
});