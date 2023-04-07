/*
  THIS IS THE APP FILE THAT HOLDS THE ENTIRE APPLICATION.
  HERE WE FIND THE HIGHER ABSTRACT LAYER OF THE APP.
  -------------------------------------------------------
  STRUCTURE: 
    1) SCREENS - TAB.NAVIGATION
      i)    HOME_SCREEN - START 
      ii)   SETTINGS
      iii)  SENSORS - UTILS
      iv)   MAP
    2) ANIMATIONS
  --------------------------------------------------------

  Unpublished Work © 2023 Minas Kosmidis
*/

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ViewBase,} from 'react-native';
import Button from './components/utils/Button';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Sensors
import AccelerometerApp from './components/sensors/Accelerometer';
import { pdrApp } from './components/PDR/pedestrianDeadReckoning';
import GyroscopeApp from './components/sensors/Gyroscope';

export default function App() {
  return(
    <pdrApp />
  );
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
    backgroundColor: "#081f41"
  }
});