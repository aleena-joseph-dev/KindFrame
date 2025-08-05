import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DataService } from '../../services/dataService';

export default function TestCoreMemoryScreen() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testCreateCoreMemory = async () => {
    try {
      addTestResult('Testing create core memory...');
      const result = await DataService.createCoreMemory({
        title: 'Test Memory',
        description: 'This is a test memory',
        memory_date: new Date().toISOString().split('T')[0],
        tags: ['Happy', 'Test'],
        importance_level: 3,
        is_favorite: false
      });

      if (result.success && result.data) {
        addTestResult(`✅ Created core memory: ${result.data.title}`);
        addTestResult(`   ID: ${result.data.id}`);
      } else {
        addTestResult(`❌ Failed to create core memory: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error creating core memory: ${error}`);
    }
  };

  const testGetCoreMemories = async () => {
    try {
      addTestResult('Testing get core memories...');
      const result = await DataService.getCoreMemories();

      if (result.success && result.data) {
        const memories = result.data as any[];
        addTestResult(`✅ Retrieved ${memories.length} core memories`);
        memories.forEach(memory => {
          addTestResult(`   - ${memory.title} (${memory.id})`);
        });
      } else {
        addTestResult(`❌ Failed to get core memories: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error getting core memories: ${error}`);
    }
  };

  const testDeleteCoreMemory = async () => {
    try {
      addTestResult('Testing delete core memory...');
      
      // First, get a memory to delete
      const getResult = await DataService.getCoreMemories();
      if (getResult.success && getResult.data) {
        const memories = getResult.data as any[];
        if (memories.length > 0) {
          const memoryToDelete = memories[0];
          addTestResult(`Attempting to delete: ${memoryToDelete.title}`);
          
          const deleteResult = await DataService.deleteCoreMemory(memoryToDelete.id);
          if (deleteResult.success) {
            addTestResult(`✅ Successfully deleted core memory: ${memoryToDelete.title}`);
          } else {
            addTestResult(`❌ Failed to delete core memory: ${deleteResult.error}`);
          }
        } else {
          addTestResult('No memories to delete');
        }
      } else {
        addTestResult(`❌ Failed to get memories for deletion: ${getResult.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error deleting core memory: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Core Memory DataService Test</Text>
        <Text style={styles.subtitle}>Test the database integration for core memories</Text>
      </View>

      <ScrollView style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#3b82f6' }]}
          onPress={testCreateCoreMemory}
        >
          <Text style={styles.buttonText}>Test Create Core Memory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#10b981' }]}
          onPress={testGetCoreMemories}
        >
          <Text style={styles.buttonText}>Test Get Core Memories</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ef4444' }]}
          onPress={testDeleteCoreMemory}
        >
          <Text style={styles.buttonText}>Test Delete Core Memory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#6b7280' }]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        <ScrollView style={styles.resultsList}>
          {testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultsList: {
    flex: 1,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
}); 