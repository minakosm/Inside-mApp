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

const _freqUpdate = 200;

// Start Accelerometer - Gyroscope Subscripitons

export default PDRApp = () => {
    const [started, setStarted] = useState(false);

    const [accelAvail, setAccelAvail] = useState(false);
    const [gyroAvail, setGyroAvail] = useState(false);

    const [accelSub, setAccelSub] = useState(null);
    const [gyroSub, setGyroSub] = useState(null);

    const [accelData, setAccelData] = useState(null);
    const [gyroData, setGyroData] = useState(null);

    const startSubscriptions = () => {
        Accelerometer.isAvailableAsync()
        .then((resolve) => setAccelAvail(resolve))
        .catch(isRejectedWithValue(reject => setAccelAvail(reject)));

        Gyroscope.isAvailableAsync()
        .then((resolve) => setGyroAvail(resolve))
        .catch(isRejectedWithValue((reject) => setGyroAvail(reject)));
        
        if(accelAvail && gyroAvail) {
            
            setAccelSub(Accelerometer.addListener(setAccelData));
            setGyroSub(Gyroscope.addListener(setGyroData));

            Accelerometer.setUpdateInterval(_freqUpdate);
            Gyroscope.setUpdateInterval(_freqUpdate);

            setStarted(true);
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
                <Text>{JSON.stringify(accelData)}</Text>
            </View>
            <View style={{marginVertical: 10}}> 
                <Text>{JSON.stringify(gyroData)}</Text>
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