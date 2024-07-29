# Inside-mApp 
Inside-mApp is an indoor positioning mobile phone application designed for my thesis with title "Implementation of an indoor positioning system for area classification, using mobile phone sensors" for my Electrical and Computer Engineering studies in the Aristotle University of Thessaloniki
([pdf](https://ikee.lib.auth.gr/record/356543/?ln=en) in greek)

This repository holds the code developed in the context of the implementation of the application

[![runs with Expo Go](https://img.shields.io/badge/Runs%20with%20Expo%20Go-4630EB.svg?style=flat-square&logo=EXPO&labelColor=f3f3f3&logoColor=000)](https://expo.dev/client)

## Description
Inside-mApp is an offline, autonomous and automated smartphone application that enables the user to navigate within his area of interest, by holding the mobile device in front of them. This application collects data from the accelerometer and gyroscope, processes it and displays the user's position within the corresponding map on the screen in real time. The functional structure of the application is divided into two main parts, the navigation part and the localization part. The navigation function is based on a PDR method for recognizing the user's steps and rotation. In the localization part, a Particle Filter which utilizes the indoor space information from the corresponding occupancy map is used which combines the spatial data with the results of the navigation component in order to calculate the final estimated pose of the user with respect to the space of interest
### PDR Navigation
The Pedestrian Dead Reckoning (PDR) navigation module is based on a  method that consists of submodules for Step Detection, Step Length Estimation and User Rotation Angle Estimation. 

For the Step Detection submodule, a combination of zero-crossing and peak detection method is used in order to match two consecutive vertical acceleration peaks (a maximum and a minimum) so their values can be propagated to the Step Length Estimation submodule.
Then, the length of each detected step can be calculated via a biomechanic formula: $$l = K\sqrt[4]{a_{max} - a_{min}}$$ where $K$ is a variable for unit measurement conversion which needs calibration for each different user. 

In parallel to Step Detection and Step Length Estimation, the User Rotation Estimation submodule is running, that is responsible for the detection of user rotation and the calculation of the rotation angle. The angle is calculated via 
a custom formula $$\theta = \frac{1}{2}(\omega_{peak} + m_{\omega})t_{turn}$$ where $\theta$ is the calculated rotation angle, $\omega_{peak}$ is the maximum (or minimum) value of the angular velocity for the time period of the detected rotation,
$m_\omega$ is the mean angular velocity of the rotation time period and $t_{turn}$ is the rotation time.

### Particle Filter Localization
The localization module is based on the implementation of a Particle Filter with each particle representing a possible spatial state of the user. 
The filter takes as inputs the length of each detected step and the rotation angle of each detected turn from the navigation module and propagates each particle based on these inputs. In order to spread the particles in the space of interest,
we also introduce a gaussian random error to the input values. The step length error standar deviation is set to $0.2m$ whilst for the rotation angle is set to $5^\circ$.

The particle weight distribution depends from their distance from objects-walls. If a particle is near an obstacle then a new weight is calculated that is a function of the freedom of movement of the particle (if it has many obstacles around it or not) and the distance from aforementioned objects.

#### Maps
In order for the localization algorithm to work, a map of the space of interest must be provided. In the context of this particular thesis there were two occupancy grid maps availiable: A map of the Computer Architecture Lab in the Department (left) and a 
rough floor plan of a domestic space created in `Matlab` enviroment (right).

<p align="middle">
  <img src="https://github.com/minakosm/Inside-mApp/blob/master/assets/maps/labMap.png" width="400" height="400" >
  <img src="https://github.com/minakosm/Inside-mApp/blob/master/assets/maps/livingRoomMap.png" width="400" height="400">
</p>


> [!NOTE]
> In order to add and use an new occupancy grid map, a `.json` file with space-room information must be provided in the device's filesystem and a `.png` image of the grid with the same name in the `assets/maps` folder (see [assets](https://github.com/minakosm/Inside-mApp/blob/master/assets/maps)). The json fields are described by the table below
>
> | Data Field | Description |
>|-----:|---------------|
>|binaryMap |occupancy grid matrix |
>|size      |MxN grid matrix size  |
>|resolution|cells/meters          |
>|imageName |filename string       |
>|extension |.png                  |
> |rooms    |room info             |


## Prerequisites 
+ Node.js and npm ([installation guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm))
+ ExpoGo in your mobile device ([installation](https://expo.dev/go))
## SetUp and Run

### Developer Mode
After installing Node.js and npm run `npm i expo` to install the expo client. 
Then on the root directory of the project, run `npx expo start` to open a local server that runs the application. Now you are ready to run the application in your device by either scanning the QR code shown in your terminal or by selecting the project from the Expo Go app.

### Usage
The HomeScreen consists of a button that enables the user to pick a map from the stored `.json` files in their device's filesystem manager.
The starting position in the space of interest, can be defined by double-tapping on the map window. After that, the user direction can be initialized with a pan gesture on the map window shown in the app. Now, before a navigation session starts, the user must hold their devicee in front of them and press the `START/STOP` button on the top of the screen.

Other availiable funfunctions are: 

+ **SAVE**: Stores all sensor data recorded througout the session plus pathing data.
+ **CLEAR**: Clears all recorded and produced data and initializes the application.
+ **+STEP**: Can move all particles a step forward with constant length and adds it in the Step History data.
+ **$\pm45^\circ$**: Rotates particles $45^\circ$ to the left ($+$) or to the right ($-$).
+ **RoomChange**: For Debugging and Experimenting Purposes. Button to keep track ground truth room changes.
+ **HomeScreen**: Returns to the HomePage where the user can pick another map.

In addition the user can change on the fly two basic parameters of the Particle Filter: 
+ **N**: Number of particles, and
+ **k-Best**: Number of particles with the highest weight value that contribute in the user state estimation
  
<p align="middle">
  <img src="https://github.com/minakosm/Inside-mApp/assets/62264217/cddfc4f1-333a-4dbd-a660-de33f37dd5f3">
</p>

