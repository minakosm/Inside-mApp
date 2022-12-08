import React, { useState, useEffect} from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Barometer } from "expo-sensors";

export default function BarometerApp() {
    const [{pressure, relativeAltitude}, setData] = useState({
        pressure: 0,
        relativeAltitude: 0,
    });

    const [subscription, setSubscription] = useState(null);

    const _slow = () => Barometer.setUpdateInterval(1000);
    const _fast = () => Barometer.setUpdateInterval(100);

    const _subscribe = () => {
        setSubscription(
            Barometer.addListener(setData)
        );
    }

    const _unsubscribe = () => {
        subscription && subscription.remove();
        setSubscription(null);
    }

    useEffect(() => {
        _subscribe();
        return () => _unsubscribe();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Barometer: </Text>
            <Text style={styles.text}>Pressure: (hPa) {pressure}</Text>
            <Text style={styles.text}>Relative Altitude: {' '}
            {Platform.OS === 'ios'? '${relativeAltitude} m' : 'Only Availiable on iOS'}
            </Text>
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
    );

}

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
        padding: 20,
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
    }
})