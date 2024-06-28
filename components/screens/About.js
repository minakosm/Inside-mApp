import * as React from 'react'
import { StyleSheet, Text, View, Image, ScrollView, Linking, TouchableHighlight } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';

export default class AboutPage extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <LinearGradient colors={['#3f4733', '#081f41']} style={styles.externalContainer}>
                <View style={{ marginTop: "50%" }} />
                <View style={styles.container}>
                    <Image source={require('./../../assets/favicon.png')} style={styles.logo} resizeMode="contain" />
                </View>
                <View style={{ marginTop: 10 }} />
                <ScrollView>
                    <View>
                        <Text style={{
                            textAlign: 'justify',
                            color: '#ddd',
                            marginHorizontal: 20
                        }}>
                            Inside-mApp is an application created for the purposes of the thesis with title "Extractoion of Room Classification Data, using Mobile Phone Sensors" given by the Intelligent Systems and Software Engineering Labgroup (ISSEL), which belongs to the Information Processing Laboratory (IPL) of the Department of Electrical and Computer Engineering at the Aristotle University of Thessaloniki.
                        </Text>
                        {/* <View style={{ marginTop: 10 }} />
                        <Text style={{
                            textAlign: 'justify',
                            color: '#ddd',
                            marginHorizontal: 20
                        }}>
                            Inside-mApp is free to use, nevertheless, if you use it to conduct research, please cite the following paper:
                        </Text>
                        <View style={{ marginTop: 10 }} />
                        <Text style={{
                            textAlign: 'center',
                            color: '#ffcf1b'
                        }}>
                            XXX
                        </Text> */}
                        <View style={{ marginTop: 10 }} />
                        <View style={styles.dataContainerMiddle}>
                            <TouchableHighlight
                                style={styles.button}
                                onPress={() => { Linking.openURL('https://issel.ee.auth.gr/') }}
                            >
                                <Text
                                    style={styles.buttonText}
                                >ISSEL</Text>
                            </TouchableHighlight>
                            {/* <TouchableHighlight
                                style={styles.button}
                                onPress={() => { Linking.openURL('https://cenote.sidero.services/') }}
                            >
                                <Text
                                    style={styles.buttonText}
                                >Cenote</Text>
                            </TouchableHighlight> */}
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        );
    }
}

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
});