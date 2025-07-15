import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, FAB } from 'react-native-paper';
import { API_URL } from '../config';

const BuildingList = ({ navigation }) => {
  const [buildings, setBuildings] = useState([]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/buildings`);
      const data = await response.json();
      setBuildings(data);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBuildings();
    });

    return unsubscribe;
  }, [navigation]);

  const renderBuilding = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>{item.name}</Title>
        <Paragraph>{item.address}</Paragraph>
        <Paragraph>Added: {new Date(item.created_at).toLocaleDateString()}</Paragraph>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={buildings}
        renderItem={renderBuilding}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
      />
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddBuilding')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default BuildingList; 