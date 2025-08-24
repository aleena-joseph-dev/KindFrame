// Pomodoro Tasks Panel Component
// Displays the list of tasks and provides add/link functionality

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PomodoroTask } from '@/lib/pomodoro/types';
import Svg, { Path } from 'react-native-svg';

interface TasksPanelProps {
  tasks: PomodoroTask[];
  onTaskToggle: (taskId: string) => void;
  onTaskActivate: (taskId: string) => void;
  onAddOrLink: () => void;
  onTaskOptions: (taskId: string) => void;
}

export default function TasksPanel({
  tasks,
  onTaskToggle,
  onTaskActivate,
  onAddOrLink,
  onTaskOptions,
}: TasksPanelProps) {
  const { colors } = useThemeColors();

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return '📋';
      case 'todo':
        return '✅';
      case 'event':
        return '📅';
      default:
        return '📝';
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return '#8B5CF6';
      case 'todo':
        return '#10B981';
      case 'event':
        return '#F59E0B';
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tasks</Text>
          <View style={[styles.headerLine, { backgroundColor: colors.border }]} />
        </View>
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => onTaskOptions('header')}
        >
          <Text style={[styles.optionsIcon, { color: colors.textSecondary }]}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <View style={styles.tasksList}>
          {tasks.map((task) => (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                task.isActive && [
                  styles.activeTaskCard,
                  { borderLeftColor: colors.topBarBackground },
                ],
              ]}
            >
              {/* Checkbox */}
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  {
                    borderColor: colors.border,
                    backgroundColor: task.isCompleted ? colors.topBarBackground : 'transparent',
                  },
                ]}
                onPress={() => onTaskToggle(task.id)}
              >
                {task.isCompleted && (
                  <Text style={[styles.checkmark, { color: colors.background }]}>✓</Text>
                )}
              </TouchableOpacity>

              {/* Task Info */}
              <TouchableOpacity
                style={styles.taskInfo}
                onPress={() => onTaskActivate(task.id)}
                activeOpacity={0.7}
              >
                <View style={styles.taskHeader}>
                  <Text style={[styles.taskTitle, { color: colors.text }]}>
                    {task.title}
                  </Text>
                  <View style={styles.taskTypeContainer}>
                    <Text style={styles.taskTypeIcon}>{getTaskTypeIcon(task.type)}</Text>
                    <View
                      style={[
                        styles.taskTypeBadge,
                        { backgroundColor: getTaskTypeColor(task.type) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.taskTypeText,
                          { color: getTaskTypeColor(task.type) },
                        ]}
                      >
                        {task.type}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Pomodoro Counter */}
                <View style={styles.pomodoroCounter}>
                  <Text style={[styles.counterText, { color: colors.textSecondary }]}>
                    {task.completedPomos}/{task.estPomos}
                  </Text>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                      fill={colors.topBarBackground}
                    />
                  </Svg>
                </View>
              </TouchableOpacity>

              {/* Task Options */}
              <TouchableOpacity
                style={styles.taskOptions}
                onPress={() => onTaskOptions(task.id)}
              >
                <Text style={[styles.optionsIcon, { color: colors.textSecondary }]}>⋯</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No tasks yet. Add your first task to get started!
          </Text>
        </View>
      )}

      {/* Add Task Button */}
      <TouchableOpacity
        style={[
          styles.addTaskButton,
          {
            borderColor: colors.topBarBackground,
            backgroundColor: colors.surface,
          },
        ]}
        onPress={onAddOrLink}
        activeOpacity={0.8}
      >
        <Text style={[styles.addTaskIcon, { color: colors.topBarBackground }]}>+</Text>
        <Text style={[styles.addTaskText, { color: colors.topBarBackground }]}>
          Add Task
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 16,
  },
  headerLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  optionsButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tasksList: {
    gap: 12,
    marginBottom: 24,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeTaskCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#000',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  taskTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTypeIcon: {
    fontSize: 16,
  },
  taskTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskTypeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pomodoroCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskOptions: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 12,
  },
  addTaskIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addTaskText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
