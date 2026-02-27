import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../components/Header';

const ResultScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { result } = route.params;

  const getStressLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'low stress':
        return '#4CAF50';
      case 'medium stress':
        return '#FF9800';
      case 'high stress':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStressLevelIcon = (level) => {
    switch (level.toLowerCase()) {
      case 'low stress':
        return '😊';
      case 'medium stress':
        return '😐';
      case 'high stress':
        return '😰';
      default:
        return '🤔';
    }
  };

  const handleRetakeQuiz = () => {
    Alert.alert(
      'Retake Quiz',
      'Would you like to take the quiz again?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => navigation.navigate('RoleSelectionScreen') }
      ]
    );
  };

  const handleGoHome = () => {
    navigation.navigate('HomeScreen');
  };

  const parseTips = (tips) => {
    if (!tips) return [];
    
    // Split tips by the warning emoji and filter out empty strings
    const tipSections = tips.split('⚠️').filter(section => section.trim());
    
    return tipSections.map((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0]?.replace(/\*\*/g, '').trim() || '';
      const explanation = lines[1]?.trim() || '';
      const tip = lines[2]?.replace(/💡 _Tip_: /, '').trim() || '';
      
      return { title, explanation, tip };
    });
  };

  const tips = parseTips(result.tips);

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView style={styles.content}>
        {/* Stress Level Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Your Stress Assessment</Text>
          
          <View style={styles.stressLevelCard}>
            <Text style={styles.stressIcon}>
              {getStressLevelIcon(result.stress_level)}
            </Text>
            <Text style={[
              styles.stressLevel,
              { color: getStressLevelColor(result.stress_level) }
            ]}>
              {result.stress_level}
            </Text>
            <Text style={styles.scoreText}>Score: {result.score}/40</Text>
          </View>

          <Text style={styles.summaryDescription}>
            Based on your responses, here's your personalized stress analysis and recommendations.
          </Text>
        </View>

        {/* Stress Categories */}
        {result.subcategory_analysis && result.subcategory_analysis.length > 0 && (
          <View style={styles.categoriesContainer}>
            <Text style={styles.sectionTitle}>Areas of Concern</Text>
            <View style={styles.categoriesList}>
              {result.subcategory_analysis.map((category, index) => (
                <View key={index} style={styles.categoryItem}>
                  <Text style={styles.categoryText}>
                    • {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Detailed Tips */}
        {tips.length > 0 && (
          <View style={styles.tipsContainer}>
            <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
            {tips.map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipExplanation}>{tip.explanation}</Text>
                <View style={styles.tipSuggestion}>
                  <Text style={styles.tipLabel}>💡 Suggestion:</Text>
                  <Text style={styles.tipText}>{tip.tip}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* No Stress Detected */}
        {tips.length === 0 && (
          <View style={styles.noStressContainer}>
            <Text style={styles.noStressIcon}>🎉</Text>
            <Text style={styles.noStressTitle}>Great News!</Text>
            <Text style={styles.noStressText}>
              No concerning stress patterns were detected in your responses. 
              Keep up the good work with your current stress management strategies!
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetakeQuiz}>
            <Text style={styles.retakeButtonText}>Retake Quiz</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Resources */}
        <View style={styles.resourcesContainer}>
          <Text style={styles.resourcesTitle}>Additional Resources</Text>
          <Text style={styles.resourcesText}>
            • Practice deep breathing exercises{'\n'}
            • Maintain a regular sleep schedule{'\n'}
            • Stay connected with friends and family{'\n'}
            • Consider professional help if stress persists
          </Text>
        </View>
      </ScrollView>
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
  },
  summaryContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  stressLevelCard: {
    backgroundColor: '#f8f9fa',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  stressIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  stressLevel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scoreText: {
    fontSize: 16,
    color: '#666',
  },
  summaryDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoriesList: {
    backgroundColor: '#fff5f5',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF69B4',
  },
  categoryItem: {
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
  },
  tipsContainer: {
    marginBottom: 20,
  },
  tipCard: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tipExplanation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  tipSuggestion: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF69B4',
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
  },
  noStressContainer: {
    backgroundColor: '#f0fff0',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  noStressIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  noStressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  noStressText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  retakeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resourcesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  resourcesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  resourcesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ResultScreen;
