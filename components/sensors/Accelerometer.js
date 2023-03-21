import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { Slider } from "@miblanchard/react-native-slider";

import { Accelerometer } from "expo-sensors";
import { filter, dotProduct } from "../utils/utilities";
import { LineChart } from 'react-native-chart-kit';

var lastSent = null;
var hzMapping = {
    0: 0.0000000001,
    1: 1,
    2: 5,
    3: 10,
    4: 20,
    5: 50,
  };

let tempData=[];
const DATASET_LENGTH = 19;

export default AccelerometerApp = (props) => {
    //Accelerometer State variables 
    const [filteredData, setFilteredData] = useState([]);
    const [accel1D, setAccel1D] = useState([]);
    const [graphData, setGraphData] = useState([]);
    const [freqValue, setFreqValue] = useState(0);
    const [accelCount, setAccelCount] = useState(0);

    const [started, setStarted] = useState(false);
    const [available, setAvailable] = useState(false);

    //Frequency Handler
    const handleValueChange = (value) => {
        let realValue = hzMapping[value];
        setFreqValue(realValue);
        let v = parseInt(1000.0 / parseFloat(realValue));
        Accelerometer.setUpdateInterval(v);
    };

    useEffect(() => {
        Accelerometer.removeAllListeners()
        if(!started) {
            setAvailable(Accelerometer.isAvailableAsync());
            setStarted(true);
            handleValueChange("0");
        }
        Accelerometer.addListener(accelerometerData => {
            setAccelCount(accelCount + 1);
            tempData.push({
              "data": accelerometerData,  // {x: Number, y: Number, z: Number}
              "timestamp": Date.now(),    // Number 
            });  
            
            if(accelCount === DATASET_LENGTH){
              setFilteredData(filter(tempData, {type: "lowPass", freq: 0}));
              for(var i in filteredData){
                accel1D.push(dotProduct(filteredData[i][0], filteredData[i][1]));
              }
              setGraphData(accel1D.splice(-100));
              tempData = [];
              setAccelCount(0);
            }            
        })
        return () => Accelerometer.removeAllListeners();
    }, [accelCount]);

    return(
        <View>
            <View>
                <View style={styles.titleContainer}>
                    <View style={styles.counter}>
                        <Text style={styles.counterText}>{accelCount}</Text>
                    </View>
                    <Text style={styles.title}>
                        ACCELEROMETER
                    </Text>
                </View>
                <View style={styles.dataContainer}>
                    <Text style={styles.text}>{freqValue} Hz</Text>  
                    <Slider 
                        style={{width: "100%", height: 10}}
                        minimumValue={0}
                        maximumValue={5}
                        value={0}
                        minimumTrackTintColor="#344763"
                        maximumTrackTintColor="#000"
                        flex={4}
                        step={1}
                        onSlidingComplete={handleValueChange}
                    />
                </View>
                <View style={{marginVertical: 10}}>
                  <Text>Data: (length = {graphData.length}) {JSON.stringify(graphData)}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 5,
      marginHorizontal: 20,
      marginTop: 20,
      backgroundColor: "#ffcf1b",
      elevation: 10,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    title: {
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      color: "#ffffff",
      flex: 4
    },
    dataContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: 20,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      backgroundColor: "white",
      padding: 10,
    },
    dataContainerMiddle: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: 20,
      backgroundColor: "white",
      padding: 5,
    },
    text: {
      textAlign: 'center',
      flex: 1,
      fontWeight: "bold"
    },
    counter: {
      marginHorizontal: 10,
      paddingHorizontal: 0,
      backgroundColor: '#344763',
      borderRadius: 10,
      flex: 1,
      width: 20,
      elevation: 10
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
    buttonText: {
      color: '#344763',
      fontSize: 11,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    caret: {
      marginHorizontal: 10,
      paddingHorizontal: 0,
      flex: 1,
      width: 20
    },
    counterText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });