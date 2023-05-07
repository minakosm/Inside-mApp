/* PDR CONSISTS OF THESE SUBMODULES
    1) step detection 
    2) step length estimation
    3) heading estimation
*/

import React, { useState, useEffect, useReducer } from "react";
import { StyleSheet, Text, View, Dimensions, AppState, TouchableOpacity } from "react-native";
import { Slider } from "@miblanchard/react-native-slider";

import { Accelerometer, Gyroscope } from "expo-sensors";
import { filter, dotProduct } from "../utils/utilities"; 
import Button from "../utils/Button";
import { isRejectedWithValue } from "@reduxjs/toolkit";
import { LineChart } from "react-native-chart-kit";

const _freqUpdate = 200;
var lastSent = null ;
var accelerometerData = {
    x: [], 
    y: [],
    z: [],
    norm: [],
};
var gyroscopeData = {
    x: [], 
    y: [],
    z: [],
};

// Start Accelerometer - Gyroscope Subscripitons

export default DeadReckoningApp = () => {
    const [started, setStarted] = useState(false);

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
        accelerometerData.x.push(data.x);
        accelerometerData.y.push(data.y);
        accelerometerData.z.push(data.z);
        accelerometerData.norm.push(Math.sqrt(
            Math.pow(data.x, 2) +
            Math.pow(data.y, 2) +
            Math.pow(data.z, 2)
        ));        
    }

    const gyroDataCallback = (data) => {
        gyroscopeData.x.push(data.x);
        gyroscopeData.y.push(data.y);
        gyroscopeData.z.push(data.z);
    }

    const testerFunction =  () => {
        startSubscriptions();
        
        console.log(`Subscriptions called from an outside Function`);
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
                            {
                                data: accelerometerData.norm,
                                strokeWidth: 3,
                                withDots: false,
                                color: () => `rgb(170, 135, 100)`,
                            },
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
                        ],
                        legend: ['Accel Norm', 'X', 'Y', 'Z']
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