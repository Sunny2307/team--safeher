import axios from 'axios';

// Base URL for the Python Flask backend
// Use your computer's IP address instead of 10.181.142.178 for React Native
const STRESS_API_BASE_URL = 'https://safeher-quiz-vercel.vercel.app';

const stressService = {
  // Get questions for a specific role
  getQuestions: async (role) => {
    try {
      console.log('Making request to:', `${STRESS_API_BASE_URL}/get-questions`);
      console.log('Request payload:', { role });

      const response = await axios.post(`${STRESS_API_BASE_URL}/get-questions`, {
        role: role
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data || {}));

      // Check if response contains an error
      if (response.data.error) {
        console.error('Server returned error:', response.data.error);
        throw new Error(response.data.error);
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching questions:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to server. Please make sure Flask server is running.');
      } else if (error.code === 'TIMEOUT') {
        throw new Error('Request timed out. Please check your network connection.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error('Failed to fetch questions. Please try again.');
      }
    }
  },

  // Submit answers and get stress analysis
  submitAnswers: async (role, answers) => {
    try {
      console.log('Submitting answers to:', `${STRESS_API_BASE_URL}/submit-answers`);
      console.log('Request payload:', { role, answers });
      const response = await axios.post(`${STRESS_API_BASE_URL}/submit-answers`, {
        role: role,
        answers: answers
      });
      console.log('Submit response status:', response.status);
      console.log('Submit response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting answers:', error);
      console.error('Error details:', error.response?.data);
      throw new Error('Failed to analyze your responses. Please try again.');
    }
  }
};

export default stressService;
