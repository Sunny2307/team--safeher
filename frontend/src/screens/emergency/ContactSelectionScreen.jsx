import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Contacts from 'react-native-contacts';

const ContactSelectionScreen = ({ navigation, route }) => {
  const { onContactSelect } = route.params || {};
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    // Filter contacts based on search text
    if (searchText.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => 
        contact.displayName?.toLowerCase().includes(searchText.toLowerCase()) ||
        contact.phoneNumbers?.some(phone => 
          phone.number.includes(searchText)
        )
      );
      setFilteredContacts(filtered);
    }
  }, [searchText, contacts]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const allContacts = await Contacts.getAll();
      
      // Filter contacts with phone numbers
      const contactsWithPhones = allContacts.filter(contact => 
        contact.phoneNumbers && contact.phoneNumbers.length > 0
      );
      
      // Sort contacts alphabetically
      const sortedContacts = contactsWithPhones.sort((a, b) => 
        (a.displayName || '').localeCompare(b.displayName || '')
      );
      
      setContacts(sortedContacts);
      setFilteredContacts(sortedContacts);
      console.log('Loaded contacts:', sortedContacts.length);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Unable to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contact) => {
    console.log('Contact selected:', contact.displayName);
    if (onContactSelect) {
      onContactSelect(contact);
    }
    navigation.goBack();
  };

  const formatPhoneNumber = (phoneNumber) => {
    // Clean the number
    let number = phoneNumber.replace(/[^0-9]/g, '');
    
    // Handle different formats
    if (number.startsWith('91') && number.length === 12) {
      number = number.slice(2);
    } else if (number.startsWith('+91') && number.length === 13) {
      number = number.slice(3);
    } else if (number.startsWith('0') && number.length === 11) {
      number = number.slice(1);
    }
    
    return number;
  };

  const renderContact = ({ item }) => {
    const primaryPhone = item.phoneNumbers?.[0];
    const formattedNumber = primaryPhone ? formatPhoneNumber(primaryPhone.number) : '';
    const isValidNumber = formattedNumber.length === 10;

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          !isValidNumber && styles.invalidContact
        ]}
        onPress={() => handleContactSelect(item)}
        disabled={!isValidNumber}
      >
        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactName}>
              {item.displayName || 'Unknown Contact'}
            </Text>
            {!isValidNumber && (
              <Icon name="warning-outline" size={16} color="#ff6b6b" />
            )}
          </View>
          {primaryPhone && (
            <Text style={[
              styles.contactPhone,
              !isValidNumber && styles.invalidPhone
            ]}>
              {primaryPhone.number}
              {!isValidNumber && ' (Invalid format)'}
            </Text>
          )}
        </View>
        <Icon name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back-outline" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Contact</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-outline" size={40} color="#FF69B4" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Contact</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
            <Icon name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item, index) => `${item.recordID || index}`}
        renderItem={renderContact}
        style={styles.contactList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchText ? 'No contacts found matching your search' : 'No contacts found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F9F5FF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  contactList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  invalidContact: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  invalidPhone: {
    color: '#ff6b6b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default ContactSelectionScreen;