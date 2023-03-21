/* PDR CONSISTS OF THESE SUBMODULES
    1) step detection 
    2) step length estimation
    3) heading estimation
*/

import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { Slider } from "@miblanchard/react-native-slider";

import { Accelerometer } from "expo-sensors";
import { filter, dotProduct } from "../utils/utilities";

stepDetection