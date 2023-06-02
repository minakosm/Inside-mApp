/* PDR CONSISTS OF THESE SUBMODULES
    1) step detection 
    2) step length estimation
    3) heading estimation
*/

import React, { useState, useEffect, useReducer, useMemo } from "react";
import { StyleSheet, Text, View, Dimensions, AppState, TouchableOpacity } from "react-native";
import { Slider } from "@miblanchard/react-native-slider";

import { Accelerometer, Gyroscope } from "expo-sensors"; 
import Button from "../utils/Button";
import { isRejectedWithValue } from "@reduxjs/toolkit";
import { LineChart } from "react-native-chart-kit";

import { SensorData } from "../utils/SensorData";
import * as Filter from "../utils/Filters";

const _freqUpdate = 10; // 10 ms updateRate or 100hz 

const accelerometerData = new SensorData();
const gravAccelData = new SensorData();
const userAccelData = new SensorData();


const gyroscopeData = new SensorData();
const userGyroData = new SensorData();

// Start Accelerometer - Gyroscope Subscripitons

export default DeadReckoningApp = () => {
    const [started, setStarted] = useState(false);
    const [clear, setClear] = useState(true);

    const [accelAvail, setAccelAvail] = useState(false);
    const [gyroAvail, setGyroAvail] = useState(false);

    const [accelSub, setAccelSub] = useState(null);
    const [gyroSub, setGyroSub] = useState(null);

    const [stepCount, setStepCount] = useState(0);
    const [stepDist, setStepDist] = useState(0);
    const [lastAccIdx, setLastAccIdx] = useState(0);
    const [lastGyroIdx, setLastGyroIdx] = useState(0);

    const [testArea, setTestArea] = useState(0);

    const startSubscriptions = () => {
        Accelerometer.isAvailableAsync()
        .then((resolve) => setAccelAvail(resolve))
        .catch(isRejectedWithValue(reject => setAccelAvail(reject)));

        Gyroscope.isAvailableAsync()
        .then((resolve) => setGyroAvail(resolve))
        .catch(isRejectedWithValue((reject) => setGyroAvail(reject)));
        
        if(accelAvail && gyroAvail) {
            
            Accelerometer.setUpdateInterval(_freqUpdate);
            Gyroscope.setUpdateInterval(_freqUpdate);

            setStarted(true);
            setClear(false);

            setAccelSub(Accelerometer.addListener(accelDataCallback));
            setGyroSub(Gyroscope.addListener(gyroDataCallback));
        }
        
    }

    const accelDataCallback = (data) => {
        accelerometerData.pushData(data);
    }

    const gyroDataCallback = (data) => {
        gyroscopeData.pushData(data);
    }

    const stopSubscriptions = () => {
        Accelerometer.removeAllListeners();
        Gyroscope.removeAllListeners();
        
        setAccelSub(null);
        setGyroSub(null);

        setStarted(false);
        // processAccData();
        processGyroData();
        console.log(`------------------------------------------------`);
    }

    const clearScreen = () => {
        setStarted(false);
        setClear(true);

        Accelerometer.removeAllListeners();
        setAccelSub(null);
        Gyroscope.removeAllListeners();
        setGyroSub(null);

        setStepCount(0);
        setStepDist(0);
        setLastAccIdx(0);

        setTestArea(0);
        setLastGyroIdx(0);

        accelerometerData.clear();
        gravAccelData.clear();
        userAccelData.clear();
        
        gyroscopeData.clear();
        userGyroData.clear();
    }

    function countSteps(acc1d){
        const THRESH = -0.04;
        const WEIGHT = 1;
        const FREQ = 1;

        let stepFlag = true;
        let firstStep = false;
        let stepTimestamps = [];

        let start = 0 ;
        let end  = 0 ;


        for(let i=lastAccIdx; i<acc1d.length; i++){
            if(stepFlag) {
                if(acc1d[i] <= THRESH && acc1d[i-1] > THRESH){
                    setStepCount((c) => c + 1);
                    firstStep = true;
                    stepTimestamps.push(i*_freqUpdate - stepTimestamps[stepTimestamps.length-1]); //100 hz sample rate
                    start = i-1;
                    stepFlag = false;
                }

                if(acc1d[i] <= 0 && acc1d[i-1] > 0 && firstStep){
                    end = i;
                    let a_min = Math.min(...acc1d.slice(start, end));
                    let a_max = Math.max(...acc1d.slice(start, end));

                    let stepLength = Math.pow(Math.abs(a_max-a_min), 1/4);
                    console.log(`stepLength = ${stepLength}`);
                    setStepDist((d) => d + stepLength);
                }
            }

            if(acc1d[i] > 0 && acc1d[i-1] <= 0 && !stepFlag) {
                stepFlag=true;
            }
        }
    }

    function processAccData() {

        gravAccelData.setData({
            x: Filter.low_0_hz(accelerometerData.x),
            y: Filter.low_0_hz(accelerometerData.y),
            z: Filter.low_0_hz(accelerometerData.z)
        });

        userAccelData.setData({
            x: accelerometerData.x.map((v, i) => v - gravAccelData.x[i]), 
            y: accelerometerData.y.map((v, i) => v - gravAccelData.y[i]), 
            z: accelerometerData.z.map((v, i) => v - gravAccelData.z[i])
        });
    
        let a1D = Filter.high_1_hz(Filter.low_5_hz(dotProduct(gravAccelData, userAccelData)));
    
        countSteps(a1D);
        setLastAccIdx(accelerometerData.x.length);
    };

    function processGyroData() {
        userGyroData.setData({
            x: Filter.low_5_hz(gyroscopeData.x),
            y: Filter.low_5_hz(gyroscopeData.y),
            z: Filter.low_5_hz(gyroscopeData.z)
        });

        for(let i=lastGyroIdx; i<gyroscopeData.z.length; i++){
            setTestArea((c) => c + (gyroscopeData.z[i]*(_freqUpdate*0.001))*(180 / Math.PI));
        }

        setLastGyroIdx(gyroscopeData.z.length);
    }

    useEffect(() => {
        startSubscriptions();
        return () => clearScreen();
    }, []);

    return (
        <View style={{marginVertical: 40, 
                      alignItems: 'center'}}>
            <Text>PDR APP</Text>
            <View style={{marginVertical: 10,
                          alignItems: 'center'}}>
                <Text>started: {JSON.stringify(started)}</Text>
                <Text style={{marginVertical: 10}}>Accel Listeners: {JSON.stringify(Accelerometer.getListenerCount())}</Text>
                <Text style={{marginVertical: 5}}>Gyro Listeners: {JSON.stringify(Gyroscope.getListenerCount())}</Text>
                <Text style ={{marginVertical: 5, fontSize: 20, color: '#d00'}}> Step Counter: {stepCount}</Text>
                <Text style ={{marginVertical: 5, fontSize: 14, color: '#d00'}}> Distance Walked: {stepDist.toPrecision(3)} m.</Text>
                <Text style ={{marginVertical: 5, fontSize: 14, color: '#d00'}}> Current θ: {testArea.toFixed(3)} deg</Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={started? stopSubscriptions : startSubscriptions} style={styles.button}>
                                <Text>{!started? 'START' : 'STOP'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearScreen} style={styles.button}>
                                <Text>{'CLEAR'}</Text>
                </TouchableOpacity>
            </View>
            <View style={{marginVertical: 10}}> 
                <Text>Accelerometer Data length: {accelerometerData.x.length}</Text>
            </View>
            <View style={{marginVertical: 10}}> 
                <Text>Gyroscope Data length: {gyroscopeData.x.length}</Text>
            </View>
            <View>
                <LineChart 
                    data={{
                        datasets:[
                            {
                                data: gyroscopeData.x.slice(-600),
                                strokeWidth: 2,
                                withDots: false,
                                color: () => `rgb(100, 0, 0)`,
                            },
                            {
                                data: gyroscopeData.y.slice(-600),
                                strokeWidth: 2,
                                withDots: false,
                                color: () => `rgb(0, 100, 0)`,
                            },
                            {
                                data: gyroscopeData.z.slice(-600),
                                strokeWidth: 2,
                                withDots: false,
                                color: () => `rgb(0, 0, 100)`,
                            },
                            // {
                            //     data: Filter.high_1_hz(Filter.low_5_hz(dotProduct(gravAccelData, userAccelData))).slice(-600),
                            //     strokeWidth: 1,
                            //     withDots: false,
                            //     color: () => `rgb(255, 255, 255)`,
                            // },
                            // {
                            //     data: Array(600).fill(-0.04),
                            //     strokeWidth: 2,
                            //     withDots: false, 
                            //     color: () => 'rgb(255, 0, 0)',
                            // },
                            // {
                            //     data: Array(600).fill(0),
                            //     strokeWidth: 1, 
                            //     withDots: false, 
                            //     color: () => 'rgb(0,255,0)',
                            // },
                        ],
                        // legend: ['a1D', 'THRESH']
                        legend: ['x', 'y', 'z']
                    }}
                    width={Dimensions.get('window').width}
                    height={350}
                    withShadow={false}
                    chartConfig={{
                        backgroundGradientFrom: "#081f41",
                        backgroundGradientTo: "#081f41",
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    }}
                    fromZero={true}
                />
            </View>
        </View>
    );

} 


function dotProduct(xyzA, xyzB) {
    let res = [];

    for(let i=0; i<xyzA.x.length; i++){
        res[i] =    xyzA.x[i] * xyzB.x[i] +
                    xyzA.y[i] * xyzB.y[i] + 
                    xyzA.z[i] * xyzB.z[i];
    }

    return res;
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
      borderColor: "black",
      flex: 1,
      width: 40,
      height: 40,
      elevation: 5
    },
  });