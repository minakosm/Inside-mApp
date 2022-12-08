import React, { useState} from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ViewBase,} from 'react-native';
import Button from './components/utils/Button';

// Sensors
import AccelerometerApp from './components/sensors/Accelerometer';
import BarometerApp from './components/sensors/Barometer';
import MagnetometerApp from './components/sensors/Magnetometer';

export default function App() {
  const [sensor, setSensor] = useState(null);

  const onAccelerometer = () => {
    setSensor('accelerometer');
  };

  const onBarometer = () => {
    setSensor('barometer');
  }

  const onMagnetometer = () => {
    setSensor('magnetometer');
  }

  const onReset = () => {
    setSensor(null);
  }

  const returnSensor = (sensor) => {
    switch (sensor) {
      case 'accelerometer':{
        return(
          <AccelerometerApp />
        );
      }
      case 'barometer': {
        return(
          <BarometerApp />
        );
      }
      case 'magnetometer': {
        return(
          <MagnetometerApp />
        )
      }
      default:
        return;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.optionsContainer}>
        <View style={styles.optionsRow}>
          <Button label="Accelerometer" onPress={onAccelerometer}/>
          <Button label="Barometer" onPress={onBarometer}/>
          <Button label="Magnetometer" onPress={onMagnetometer}/>
        </View>
      </View>
      <View style={styles.dataContainer}>
        {returnSensor(sensor)}
      </View>
      <View style={styles.settingsContainer}>
        <Button label={"CLEAR"} onPress={onReset}/>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
  },
  dataContainer: {
    flex: 1,
    marginVertical: 10,
    width: "100%"
  },
  footerContainer: {
    flex: 1/3,
    alignItems: 'center',
  },
  optionsContainer: {
    marginTop: 50,
  },
  optionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  optionsColumn: {
    alignItems: 'center',
    flexDirection: 'column'
  },
  settingsContainer: {
    marginBottom: 50,
  },  
});
