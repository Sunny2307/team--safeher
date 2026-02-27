import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const HelplineScreen = () => {
  const navigation = useNavigation();

  const helplineData = [
    { id: '1', number: '112', label: 'National helpline', icon: 'call-outline', color: '#D4F1F4' },
    { id: '2', number: '108', label: 'Ambulance', icon: 'medkit-outline', color: '#D9EAFD' },
    { id: '3', number: '102', label: 'Pregnancy Medic', icon: 'heart-outline', color: '#FADCE6' },
    { id: '4', number: '101', label: 'Fire Service', icon: 'flame-outline', color: '#FFE7D1' },
    { id: '5', number: '100', label: 'Police', icon: 'shield-outline', color: '#D9EAFD' },
    { id: '6', number: '1091', label: 'Women helpline', icon: 'people-outline', color: '#FFE7D1' },
    { id: '7', number: '1098', label: 'Child Helpline', icon: 'happy-outline', color: '#D9EAFD' },
    { id: '8', number: '1073', label: 'Road accident', icon: 'car-outline', color: '#FADCE6' },
    { id: '9', number: '182', label: 'Railway protection', icon: 'train-outline', color: '#D4F1F4' },
  ];

  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.color }]}
      onPress={() => handleCall(item.number)}
      activeOpacity={0.9}
    >
      <View style={styles.iconContainer}>
        <Icon name={item.icon} size={42} color="#2A2A2A" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.number}>{item.number}</Text>
        <Text style={styles.label}>{item.label}</Text>
      </View>
      <View style={styles.callButton}>
        <Icon name="call" size={28} color="#FFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>National Numbers</Text>
      </View>
      <Text style={styles.subtitle}>In case of an emergency, call an appropriate number for help.</Text>
      <FlatList
        data={helplineData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 30,
    backgroundColor: '#FF6F91',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#5A5A5A',
    textAlign: 'center',
    marginVertical: 15,
    paddingHorizontal: 20,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 18,
    padding: 16,
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  textContainer: {
    flex: 1,
  },
  number: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2A2A2A',
    marginBottom: 2,
  },
  label: {
    fontSize: 16,
    color: '#4A4A4A',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  callButton: {
    backgroundColor: '#FF6F91',
    borderRadius: 50,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default HelplineScreen;