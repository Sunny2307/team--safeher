import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';

const TermsAndConditionsScreen = () => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <Header showBack={true} showIcons={false} containerStyle={{ paddingTop: 10, marginTop: 0 }} />
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <Text style={styles.title}>Terms and Conditions</Text>
                <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Introduction</Text>
                    <Text style={styles.text}>
                        Welcome to SafeHer. By using our app, you agree to these Terms and Conditions. Please read them carefully.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. User Accounts</Text>
                    <Text style={styles.text}>
                        To use certain features of the app, you must create an account. You agree to provide accurate, current, and complete information during the registration process.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Privacy Policy</Text>
                    <Text style={styles.text}>
                        Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the app, to understand our practices.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Use of the App</Text>
                    <Text style={styles.text}>
                        You agree to use the app only for lawful purposes.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Contact Us</Text>
                    <Text style={styles.text}>
                        If you have any questions about these Terms, please contact us at safeher.safety@gmail.com.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? 20 : 0,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    lastUpdated: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    text: {
        fontSize: 16,
        color: '#444',
        lineHeight: 24,
    },
});

export default TermsAndConditionsScreen;
