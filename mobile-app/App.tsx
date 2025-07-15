import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import BuildingList from './src/screens/BuildingList';
import AddBuilding from './src/screens/AddBuilding';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="BuildingList">
          <Stack.Screen 
            name="BuildingList" 
            component={BuildingList} 
            options={{ title: 'Buildings' }}
          />
          <Stack.Screen 
            name="AddBuilding" 
            component={AddBuilding} 
            options={{ title: 'Add Building' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App; 