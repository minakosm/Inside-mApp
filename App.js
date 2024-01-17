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
import DeadReckoningApp from './components/PDR/DeadReckoning';
import PDRApp from './components/PDR/PDR';

const Tab = createBottomTabNavigator();
export default function App() {
  return(
    <NavigationContainer>
      <Tab.Navigator>
        {/* <DeadReckoningApp /> */}
        <Tab.Screen name="PDR" component={PDRApp}/>
        <Tab.Screen name = "DEADRECKONING" component={DeadReckoningApp}/>
        {/* <PDRApp /> */}
      </Tab.Navigator>
    </NavigationContainer>

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