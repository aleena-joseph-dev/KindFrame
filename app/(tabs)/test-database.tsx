import { useThemeColors } from '@/hooks/useThemeColors';
import { DataService } from '@/services/dataService';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function TestDatabaseScreen() {
  const themeResult = useThemeColors();
  const colors = themeResult.colors;
  
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testCreateNote = async () => {
    try {
      setIsLoading(true);
      addTestResult('Testing note creation...');
      
      const result = await DataService.createNote({
        title: `Test Note ${Date.now()}`,
        content: 'This is a test note created by the database test.',
        category: 'personal',
        tags: ['test', 'database']
      });

      if (result.success) {
        addTestResult('✅ Note created successfully!');
        addTestResult(`   ID: ${result.data?.id}`);
        addTestResult(`   Title: ${result.data?.title}`);
      } else {
        addTestResult(`❌ Failed to create note: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error creating note: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetNotes = async () => {
    try {
      setIsLoading(true);
      addTestResult('Testing note retrieval...');
      
      const result = await DataService.getNotes(10, 0);
      
      if (result.success) {
        addTestResult(`✅ Retrieved ${result.data?.length || 0} notes`);
        if (result.count !== undefined) {
          addTestResult(`   Total notes in database: ${result.count}`);
        }
      } else {
        addTestResult(`❌ Failed to retrieve notes: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error retrieving notes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateGoal = async () => {
    try {
      setIsLoading(true);
      addTestResult('Testing goal creation...');
      
      const result = await DataService.createGoal({
        title: `Test Goal ${Date.now()}`,
        description: 'This is a test goal created by the database test.',
        category: 'personal',
        status: 'not_started',
        priority: 'medium'
      });

      if (result.success) {
        addTestResult('✅ Goal created successfully!');
        addTestResult(`   ID: ${result.data?.id}`);
        addTestResult(`   Title: ${result.data?.title}`);
      } else {
        addTestResult(`❌ Failed to create goal: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error creating goal: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetGoals = async () => {
    try {
      setIsLoading(true);
      addTestResult('Testing goal retrieval...');
      
      const result = await DataService.getGoals();
      
      if (result.success) {
        addTestResult(`✅ Retrieved ${result.data?.length || 0} goals`);
      } else {
        addTestResult(`❌ Failed to retrieve goals: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error retrieving goals: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateTodo = async () => {
    try {
      setIsLoading(true);
      addTestResult('Testing todo creation...');
      
      const result = await DataService.createTodo({
        title: `Test Todo ${Date.now()}`,
        description: 'This is a test todo created by the database test.',
        category: 'personal',
        priority: 'medium'
      });

      if (result.success) {
        addTestResult('✅ Todo created successfully!');
        addTestResult(`   ID: ${result.data?.id}`);
        addTestResult(`   Title: ${result.data?.title}`);
      } else {
        addTestResult(`❌ Failed to create todo: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error creating todo: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetTodos = async () => {
    try {
      setIsLoading(true);
      addTestResult('Testing todo retrieval...');
      
      const result = await DataService.getTodos();
      
      if (result.success) {
        addTestResult(`✅ Retrieved ${result.data?.length || 0} todos`);
      } else {
        addTestResult(`❌ Failed to retrieve todos: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error retrieving todos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUserDataSummary = async () => {
    try {
      setIsLoading(true);
      addTestResult('Testing user data summary...');
      
      const result = await DataService.getUserDataSummary();
      
      if (result.success && result.data) {
        addTestResult('✅ User data summary retrieved:');
        addTestResult(`   Journal entries: ${result.data.journalCount}`);
        addTestResult(`   Notes: ${result.data.notesCount}`);
        addTestResult(`   Goals: ${result.data.goalsCount}`);
        addTestResult(`   Todos: ${result.data.todosCount}`);
        addTestResult(`   Completed todos: ${result.data.completedTodosCount}`);
        addTestResult(`   Mood entries: ${result.data.moodEntriesCount}`);
      } else {
        addTestResult(`❌ Failed to get user data summary: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error getting user data summary: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Database Test</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Test the DataService integration with Supabase
        </Text>
      </View>

      <ScrollView style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testCreateNote}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLoading ? 'Testing...' : 'Test Create Note'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testGetNotes}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLoading ? 'Testing...' : 'Test Get Notes'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testCreateGoal}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLoading ? 'Testing...' : 'Test Create Goal'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testGetGoals}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLoading ? 'Testing...' : 'Test Get Goals'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testCreateTodo}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLoading ? 'Testing...' : 'Test Create Todo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testGetTodos}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLoading ? 'Testing...' : 'Test Get Todos'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={testUserDataSummary}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLoading ? 'Testing...' : 'Test User Data Summary'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={clearResults}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Clear Results
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.resultsContainer}>
        <Text style={[styles.resultsTitle, { color: colors.text }]}>Test Results:</Text>
        <ScrollView style={styles.resultsList}>
          {testResults.map((result, index) => (
            <Text key={index} style={[styles.resultText, { color: colors.textSecondary }]}>
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