/* PDR CONSISTS OF THESE SUBMODULES
    1) step detection 
    2) step length estimation
    3) heading estimation
*/

import React, { useState, useEffect, useReducer } from "react";
import { StyleSheet, Text, View, Dimensions, AppState } from "react-native";
import { Slider } from "@miblanchard/react-native-slider";

import { Accelerometer, Gyroscope } from "expo-sensors";
import { filter, dotProduct } from "../utils/utilities"; 


const _freqUpdate = 200;

// Start Accelerometer - Gyroscope Subscripitons

export const pdrApp = () => {
    const [accelAvail, setAccelAvail] = useState(false);
    const [gyroAvail, setGyroAvail] = useState(false);

    const [accelSub, setAccelSub] = useState(false);
    const [gyroSub, setGyroSub] = useState(false);

    const [accelData, setAccelData] = useState(null);
    const [gyroData, setGyroData] = useState(null);

    startSubscriptions();



} 


function startSubscriptions() {
    setAccelAvail(Accelerometer.isAvailableAsync());
    setGyroAvail(Gyroscope.isAvailableAsync());

    if (accelAvail && gyroAvail) {
        Accelerometer.setUpdateInterval(_freqUpdate);
        Gyroscope.setUpdateInterval(_freqUpdate);

        setAccelSub(Accelerometer.addListener(setAccelData));
        setGyroSub(Gyroscope.addListener(setGyroData));

    } else {
        console.log("Accelerometer Availiable: ", accelAvail,"\n Gyroscope Availiable: ", gyroAvail);
    }
    
}


function stepDetection() {

}

