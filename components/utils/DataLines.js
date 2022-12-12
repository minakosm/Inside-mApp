import * as React from 'react';
import { Text, View, StyleSheet, Dimensions } from 'react-native'
import { LineChart } from 'react-native-chart-kit';
import { connect } from 'react-redux';
import { bindActionCreators } from '@reduxjs/toolkit';

// Will call <DataLines x= y= z= />

export default class DataLines extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            xData: [],
            yData: [],
            zData: [],
            min: Infinity,
            max: -Infinity,
            border: 0,
        }
    }

    findMin(arrX, arrY, arrZ) {
        for(let i=0, len = arrX.length ; i<len; i++){
            this.state.min = Math.min(this.state.min, arrX[i], arrY[i], arrZ[i]);
        }
    }
    
    findMax(arrX, arrY, arrZ) {
        for(let i=0, len = arrX.length ; i<len; i++){
            this.state.max = Math.max(this.state.max, arrX[i], arrY[i], arrZ[i]);
        }
    }

    updateData(len){
        this.state.xData.push(this.props.x);
        this.state.yData.push(this.props.y);
        this.state.zData.push(this.props.z);

        if(this.state.xData.length === len){
            this.state.xData.shift();
            this.state.yData.shift();
            this.state.zData.shift();
        }

        this.findMin(this.state.xData, this.state.yData, this.state.zData)
        this.findMax(this.state.xData, this.state.yData, this.state.zData);

        this.state.border = Math.max(Math.abs(this.state.max), Math.abs(this.state.min));
    }

    render(){
        const MAX_ARRAY_LENGTH = 30;
        this.updateData(MAX_ARRAY_LENGTH);

        return(
            <View>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>
                        {this.props.label}
                    </Text>
                </View>
                <LineChart 
                    data={{
                        datasets:[
                            {
                                data: this.state.xData,
                                strokeWidth: 2,
                                withDots: false,
                                color: () => `rgb(255, 0, 0)`,
                            },
                            {
                                data: this.state.yData,
                                strokeWidth: 2,
                                withDots: false,
                                color: () => `rgb(0, 255, 0)`,
                            },
                            {
                                data: this.state.zData,
                                strokeWidth: 2,
                                withDots: false,
                                color: () => `rgb(0, 0, 255)`,
                            },
                            {
                                data: [this.state.border], //min
                                withDots: false,
                            },
                            {
                                data: [-this.state.border], //max
                                withDots: false,
                            }
                        ],
                        legend: ['x', 'y', 'z'],
                    }}
                    width={Dimensions.get('window').width}
                    height={400}
                    withShadow={false}
                    fr
                    chartConfig={{
                        backgroundGradientFrom: "#081f41",
                        backgroundGradientTo: "#081f41",
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    }}
                    style={{
                        marginHorizontal: 10,
                    }}
                    bezier
                    fromZero={true}
                />

            </View>
        );
    }
}

const styles = StyleSheet.create({
    titleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        marginHorizontal: 10,
        backgroundColor: "#6dbe93",
        elevation: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        color: "#ffffff",
        flex: 4
    },
    dataContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        backgroundColor: "white",
        padding: 0,
    },
    text: {
        textAlign: 'center',
    },
    counter: {
        marginHorizontal: 10,
        paddingHorizontal: 0,
        backgroundColor: '#344763',
        borderRadius: 10,
        flex: 1,
        width: 20,
        elevation: 10
    },
    caret: {
        marginHorizontal: 10,
        paddingHorizontal: 0,
        flex: 1,
        width: 20
    },
    counterText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});