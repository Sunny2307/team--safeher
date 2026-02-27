import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';

const RoleSelectionScreen = () => {
  const navigation = useNavigation();

  const handleRoleSelection = (role) => {
    navigation.navigate('QuizScreen', { role, timestamp: Date.now() });
  };

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Academic pressure, peer stress, and study-related challenges',
      icon: '🎓',
      color: '#4CAF50',
    },
    {
      id: 'working_women',
      title: 'Working Women',
      description: 'Career growth, work-life balance, and professional challenges',
      icon: '💼',
      color: '#2196F3',
    },
    {
      id: 'housewife',
      title: 'Housewife',
      description: 'Domestic workload, family responsibilities, and personal time',
      icon: '🏠',
      color: '#FF9800',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>Select Your Role</Text>
        <Text style={styles.subtitle}>
          Choose the category that best describes your current situation to get personalized stress assessment
        </Text>

        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleCard, { borderLeftColor: role.color }]}
              onPress={() => handleRoleSelection(role.id)}
            >
              <View style={styles.roleHeader}>
                <Text style={styles.roleIcon}>{role.icon}</Text>
                <Text style={styles.roleTitle}>{role.title}</Text>
              </View>
              <Text style={styles.roleDescription}>{role.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>📋 About the Quiz</Text>
          <Text style={styles.infoText}>
            • 8 personalized questions based on your role{'\n'}
            • Takes about 2-3 minutes to complete{'\n'}
            • Get detailed stress analysis and tips{'\n'}
            • Your responses are kept private
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  rolesContainer: {
    marginBottom: 30,
  },
  roleCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
});

export default RoleSelectionScreen;
