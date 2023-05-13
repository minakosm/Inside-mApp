/* PDR CONSISTS OF THESE SUBMODULES
    1) step detection 
    2) step length estimation
    3) heading estimation
*/

import React, { useState, useEffect, useReducer } from "react";
import { StyleSheet, Text, View, Dimensions, AppState, TouchableOpacity } from "react-native";
import { Slider } from "@miblanchard/react-native-slider";

import { Accelerometer, Gyroscope } from "expo-sensors"; 
import Button from "../utils/Button";
import { isRejectedWithValue } from "@reduxjs/toolkit";
import { LineChart } from "react-native-chart-kit";

import { SensorData } from "../utils/SensorData";
import * as Filter from "../utils/Filters";

const _freqUpdate = 10;
var lastSent = null ;

const accelerometerData = new SensorData();
const gyroscopeData = new SensorData();

// Start Accelerometer - Gyroscope Subscripitons

export default DeadReckoningApp = () => {
    const [started, setStarted] = useState(false);
    const [clear, setClear] = useState(true);

    const [accelAvail, setAccelAvail] = useState(false);
    const [gyroAvail, setGyroAvail] = useState(false);

    const [accelSub, setAccelSub] = useState(null);
    const [gyroSub, setGyroSub] = useState(null);
 
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

    const clearSubscriptions = () => {
        Accelerometer.removeAllListeners();
        Gyroscope.removeAllListeners();
        
        setAccelSub(null);
        setGyroSub(null);

        setStarted(false);
    };

    const stepDetection = () => {
        
    }

    const accelDataCallback = (data) => { 
        accelerometerData.pushData(data);
    }

    const gyroDataCallback = (data) => {
        gyroscopeData.pushData(data);
    }

    const testerFunction =  () => {
        startSubscriptions();

        console.log(`Subscriptions called from an outside Function`);
    }

    const clearScreen = () => {
        setClear(true);
        accelerometerData.clear();
        gyroscopeData.clear();
    }

    useEffect(() => {
        startSubscriptions();
        return () => clearSubscriptions();
    }, []);

    return (
        <View style={{marginVertical: 40, 
                      alignItems: 'center'}}>
            <Text>PRD APP</Text>
            <View style={{marginVertical: 10,
                          alignItems: 'center'}}>
                <Text>started: {JSON.stringify(started)}</Text>
                <Text style={{marginVertical: 10}}>Accel Listeners: {JSON.stringify(Accelerometer.getListenerCount())}</Text>
                <Text style={{marginVertical: 5}}>Gyro Listeners: {JSON.stringify(Gyroscope.getListenerCount())}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={started? clearSubscriptions : testerFunction} style={styles.button}>
                                <Text>{!started? 'START' : 'STOP'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearScreen} style={styles.button}>
                                <Text>{'CLEAR'}</Text>
                </TouchableOpacity>
            </View>
            <View style={{marginVertical: 10}}> 
                <Text>Accelerometer Data length: {JSON.stringify(accelerometerData.x.length)}</Text>
            </View>
            <View style={{marginVertical: 10}}> 
                <Text>Gyroscope Data length: {JSON.stringify(gyroscopeData.x.length)}</Text>
            </View>
            <View>
                <LineChart 
                    data={{
                        datasets:[
                            // {
                            //     data: accelerometerData.getNorm(),
                            //     strokeWidth: 5,
                            //     withDots: false,
                            //     color: () => `rgb(255, 255, 255)`,
                            // },
                            {
                                data: accelerometerData.x,
                                strokeWidth: 1,
                                withDots: false,
                                color: () => `rgb(255, 0, 0)`,
                            },
                            {
                                data: accelerometerData.y,
                                strokeWidth: 1,
                                withDots: false,
                                color: () => `rgb(0, 255, 0)`,
                            },
                            {
                                data: accelerometerData.z,
                                strokeWidth: 1,
                                withDots: false,
                                color: () => `rgb(0, 0, 255)`,
                            },
                            {
                                data: Filter.low_0_hz(accelerometerData.x),
                                strokeWidth: 6,
                                withDots: false,
                                color: () => `rgb(155, 0, 0)`,
                            },
                            {
                                data: Filter.low_0_hz(accelerometerData.y),
                                strokeWidth: 6,
                                withDots: false,
                                color: () => `rgb(0, 155, 0)`,
                            },
                            {
                                data: Filter.low_0_hz(accelerometerData.z),
                                strokeWidth: 6,
                                withDots: false,
                                color: () => `rgb(0, 0, 155)`,
                            },
                        ],
                        legend: ['X', 'Y', 'Z', 'Fx', 'Fy', 'Fz']
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