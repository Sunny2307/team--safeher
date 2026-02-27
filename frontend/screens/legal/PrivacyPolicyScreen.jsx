import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, Platform } from 'react-native';
import Header from '../../components/Header';

const PrivacyPolicyScreen = () => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <Header showBack={true} showIcons={false} containerStyle={{ paddingTop: 10, marginTop: 0 }} />
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <Text style={styles.title}>Privacy Policy</Text>
                <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Information We Collect</Text>
                    <Text style={styles.text}>
                        We collect information you provide directly to us, such as when you create an account, update your profile, or use our services. This may include your name, phone number, and email address.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. How We Use Information</Text>
                    <Text style={styles.text}>
                        We use the information we collect to provide, maintain, and improve our services, including to facilitate emergency alerts and sharing your location with trusted contacts.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Sharing of Information</Text>
                    <Text style={styles.text}>
                        We do not share your personal information with third-party vendors or other service providers. Your data is kept confidential and used solely for the purpose of providing our services.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Security</Text>
                    <Text style={styles.text}>
                        We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Contact Us</Text>
                    <Text style={styles.text}>
                        If you have any questions about this Privacy Policy, please contact us at safeher.safety@gmail.com.
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

export default PrivacyPolicyScreen;
