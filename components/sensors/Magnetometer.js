import React, { useState, useEffect} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Magnetometer } from "expo-sensors";
import DataLines from "../utils/DataLines";

export default function MagnetometerApp() {
    const [{ x, y, z }, setData] = useState({
        x: 0, 
        y: 0,
        z: 0,
    })
    const [subscription, setSubscription] = useState(null);

    const _slow = () => Magnetometer.setUpdateInterval(1000);
    const _fast = () => Magnetometer.setUpdateInterval(100);

    const _subscribe = () => {
        setSubscription(
            Magnetometer.addListener(setData)
        );
    }

    const _unsubscribe = () => {
        subscription && subscription.remove();
        setSubscription(null);
    };


    useEffect(() => {
        _subscribe();
        return () => _unsubscribe();
    }, []);

    return (
        <View style={styles.container}>
            {Magnetometer.isAvailableAsync() ? (
                <View style={styles.text}>
                    <View style={styles.textContainter}>
                        <Text style={styles.text}>Magnetometer:</Text>
                        <Text style={styles.text}>x: {x}</Text>
                        <Text style={styles.text}>y: {y}</Text>
                        <Text style={styles.text}>z: {z}</Text>
                    </View>
                    <View style={styles.container}>
                        <DataLines x={x} y={y} z={z} label={'Magnetometer Data (μΤ)'}/>
                    </View>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={subscription ? _unsubscribe : _subscribe} style={styles.button}>
                            <Text>{!subscription ? 'START' : 'STOP'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={_slow} style={[styles.button, styles.middleButton]}>
                            <Text>Slow</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={_fast} style={styles.button}>
                            <Text>Fast</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.container}>
                    <Text style={[styles.text, {color: '#fff'}]}>SENSOR ANAVAILABLE</Text>
                </View>
            )}
        </View>
    );
};

styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#8c5e78',
        alignItems: 'center',
    },
    buttonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: "white",
        padding: 10,
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
    text: {
        textAlign: 'center',
        flex: 1,
        fontWeight: "bold",
        margin: 10,
    },
    textContainter: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginHorizontal: 10,
    },
})