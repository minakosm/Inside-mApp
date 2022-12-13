import React, {useState, useEffect} from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { DeviceMotion } from "expo-sensors";
import DataLines from "../utils/DataLines";

export default function DeviceMotionApp() {
    // const [accel, setAccel] = useState({});
    // const [accelGravity, setAccelGravity] = useState({});
    const [rotation, setRotation] = useState({
        alpha: 0,
        beta: 0,
        gamma: 0,
    });
    // const [rotationRate, setRotationRate] = useState({});
    // const [orientation, setOrientation] = useState(null);

    const [subscription, setSubscription] = useState(null);

    const _slow = () => DeviceMotion.setUpdateInterval(1000);
    const _fast = () => DeviceMotion.setUpdateInterval(100);

    const _subscribe = () =>{
        setSubscription(
            DeviceMotion.addListener((deviceMotionData) => {
                setRotation(deviceMotionData.rotation);
            })
        );
    }

    const _unsubscribe = () =>{
        subscription && DeviceMotion.removeSubscription(subscription);
        setSubscription(null);
    }

    useEffect(() => {
        _subscribe();
        return () => _unsubscribe();
    }, []);

    return (
        <View style={styles.container}>
            {DeviceMotion.isAvailableAsync() ? (
                <View style={styles.text}>
                    <View style={styles.textContainter}>
                        <Text style={styles.text}>Device Motion rotation:</Text>
                        <Text style={styles.text}>alpha: {rotation.alpha}</Text>
                        <Text style={styles.text}>beta: {rotation.beta}</Text>
                        <Text style={styles.text}>gamma: {rotation.gamma}</Text>
                    </View>
                    <View style={styles.container}>
                        <DataLines x={rotation.gamma} y={rotation.beta} z={rotation.alpha} label={'Device Rotation'}/>
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
        marginVertical: -10,
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
        fontSize: 11,
    },
    textContainter: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginHorizontal: 10,
    },
})