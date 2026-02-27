import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../components/Header';
import stressService from '../../services/stressService';

const QuizScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { role, timestamp } = route.params;

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Reset all state when component mounts
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setLoading(true);
    setSubmitting(false);

    loadQuestions();
  }, [role, timestamp]); // Re-run when role or timestamp changes

  const loadQuestions = async () => {
    try {
      setLoading(true);
      console.log('Loading questions for role:', role);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const responsePromise = stressService.getQuestions(role);
      const response = await Promise.race([responsePromise, timeoutPromise]);

      console.log('Received response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response || {}));

      // Check if response has questions property
      if (!response) {
        console.error('No response received');
        throw new Error('No response from server. Please try again.');
      }

      if (!response.questions) {
        console.error('No questions property in response:', response);
        throw new Error('Invalid response structure. Please try again.');
      }

      if (!Array.isArray(response.questions)) {
        console.error('Questions is not an array:', response.questions);
        throw new Error('Questions data is invalid. Please try again.');
      }

      if (response.questions.length === 0) {
        console.error('No questions received');
        throw new Error('No questions available. Please try again.');
      }

      console.log('Number of questions:', response.questions.length);

      // Debug: Log first question options
      if (response.questions.length > 0) {
        const firstQ = response.questions[0];
        console.log('First question options:');
        console.log('Option1:', firstQ.Option1);
        console.log('Option2:', firstQ.Option2);
        console.log('Option3:', firstQ.Option3);
        console.log('Option4:', firstQ.Option4);
        console.log('Option5:', firstQ.Option5);
      }

      setQuestions(response.questions);
      setAnswers(new Array(response.questions.length).fill(null));
    } catch (error) {
      console.error('Error loading questions:', error);
      Alert.alert(
        'Error Loading Questions',
        `Failed to load questions for ${role}. Please check:\n\n1. Flask server is running\n2. Network connection is stable\n3. Try again in a moment\n\nError: ${error.message}`,
        [
          { text: 'Go Back', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: () => loadQuestions() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerValue) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerValue;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (answers[currentQuestionIndex] === null) {
      Alert.alert('Please Answer', 'Please select an answer before proceeding.');
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const result = await stressService.submitAnswers(role, answers);
      navigation.replace('ResultScreen', { result });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'student': return 'Student';
      case 'working_women': return 'Working Women';
      case 'housewife': return 'Housewife';
      default: return role;
    }
  };

  const getOptionText = (optionNumber) => {
    const optionMap = {
      1: 'Not at all',
      2: 'Rarely',
      3: 'Sometimes',
      4: 'Often',
      5: 'Constantly'
    };
    return optionMap[optionNumber] || `Option ${optionNumber}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading your personalized quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No questions available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQuestions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView style={styles.content}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.Question}</Text>
          <Text style={styles.categoryText}>Category: {currentQuestion.Category}</Text>
        </View>

        {/* Answer Options */}
        <View style={styles.optionsContainer}>
          {[1, 2, 3, 4, 5].map((optionNumber) => (
            <TouchableOpacity
              key={optionNumber}
              style={[
                styles.optionButton,
                answers[currentQuestionIndex] === optionNumber && styles.selectedOption
              ]}
              onPress={() => handleAnswerSelect(optionNumber)}
            >
              <Text style={[
                styles.optionText,
                answers[currentQuestionIndex] === optionNumber && styles.selectedOptionText
              ]}>
                {optionNumber}. {currentQuestion[`Option${optionNumber}`]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentQuestionIndex > 0 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              answers[currentQuestionIndex] === null && styles.disabledButton
            ]}
            onPress={handleNext}
            disabled={answers[currentQuestionIndex] === null || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressContainer: {
    marginVertical: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF69B4',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  questionContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedOption: {
    borderColor: '#FF69B4',
    backgroundColor: '#fff0f5',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  selectedOptionText: {
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  previousButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  previousButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default QuizScreen;
