import { StyleSheet, View, Pressable, Text } from "react-native";

export default function Button({ label, onPress }) {

    return (
        <View style={styles.buttonContainer}>
                <Pressable 
                    style={styles.button}
                    onPress={onPress}>
                    <Text style={[styles.buttonLabel, {color: "#fff"}]}>{label}</Text>
                </Pressable>
            </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        width: 120,
        height: 40,
        marginHorizontal: 5,
        marginVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 1,
        backgroundColor: "#04f"
    },
    button: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buttonLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: "600"
    },
});