import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const Header = ({ showBack = false, showIcons = true, containerStyle = {} }) => {
  const navigation = useNavigation();

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.header, containerStyle]}>
        <View style={styles.logoSection}>
          {showBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ) : null}
          <Image
            source={require('../assets/safeher_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>SafeHer</Text>
        </View>
        {showIcons && (
          <View style={styles.iconContainer}>
            <TouchableOpacity>
              <Icon name="notifications-outline" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('MenuScreen')}>
              <Icon name="menu-outline" size={28} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 25,
    marginTop: 10,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 45,
    height: 45,
    marginRight: 10
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF69B4'
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 4,
  },
  backButton: {
    marginRight: 10,
    marginLeft: -8,
  },
});

export default Header;