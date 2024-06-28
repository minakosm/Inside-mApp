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

  Unpublished Work © 2024 Minas Kosmidis
*/

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootSiblingParent } from 'react-native-root-siblings';
//Screens
import AboutPage from './components/screens/About';
import Navigation from './components/screens/Navigation';

import * as FileSystem from 'expo-file-system';
import { SafeAreaProvider } from 'react-native-safe-area-context';
const { StorageAccessFramework } = FileSystem;


function AboutScreen() {
  return(
    <AboutPage />
  );
}

function NavigationScreen() {
  const [mapInfo, setMapInfo] = useState(null);
  const [mapImg, setMapImg] = useState(null);
  return(
    <Navigation />
  )
}

const Tab = createBottomTabNavigator();

function MyTabs() {
  return(
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#344763',
        tabBarInactiveTintColor: '#344763',
        tabBarLabelStyle: {
          fontWeight: 'bold'
        }
      })}
    >
      <Tab.Screen 
        name='Navigate'
        component={NavigationScreen}
        options={{
          headerShown: false
        }}
      />

      <Tab.Screen 
        name='About'
        component={AboutScreen}
        options={{
          headerShown: false
        }}
      />

    </Tab.Navigator>
  )
}

export default function App() {
  return(
    <RootSiblingParent>
      <SafeAreaProvider>
        <NavigationContainer>
          <MyTabs />
        </NavigationContainer>
      </SafeAreaProvider>
    </RootSiblingParent> 

   /* <PDRApp test={'this is a prop'}/> */
  );
}

const styles = StyleSheet.create({
  logo: {
    width: "50%",
    height: 100
  },
  container: {
    alignItems: "center"
  },
  externalContainer: {
    flex: 1,
    backgroundColor: "#081f"
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    marginVertical: 150,
},
});