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


import React, { Component, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ViewBase, TouchableOpacity} from 'react-native';
import Button from './components/utils/Button';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Modules
import DeadReckoningApp from './components/PDR/DeadReckoning';
import PDRApp from './components/PDR/PDR';

import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
const { StorageAccessFramework } = FileSystem;

const Tab = createBottomTabNavigator();
function App() {
  const [mapInfo, setMapInfo] = useState(null);
  const [mapImg, setMapImg] = useState(null);
  
  const selectMap = async () => {
    let documentPicked = await DocumentPicker.getDocumentAsync({});
    console.log(`RESULT`)
    console.log(documentPicked)
    if(!documentPicked.canceled) {
      const docName = documentPicked.assets[0].name.split(".");
      const mapAssetsObj = await FileSystem.readAsStringAsync(documentPicked.assets[0].uri).then((res) => JSON.parse(res));

      // Read the Map Metadata in JSON + the mapImg URI;
      setMapInfo(mapAssetsObj);
      
    } else {
      alert("Please Choose a Map File");
    }

  }

  return(
    // <View style={styles.container}>
    //   {mapInfo == null
    //   ? <Button onPress={selectMap} label={'SELECT MAP'} />
    //   : <PDRApp/>
    // }
    
  
    // </View>
    // <NavigationContainer>
    //   <Tab.Navigator>
    //     <Tab.Screen name="Navigation" component={PDRApp}/>
    //   </Tab.Navigator>
    // </NavigationContainer>

   <PDRApp test={'this is a prop'}/>
  );
}

export default App;

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