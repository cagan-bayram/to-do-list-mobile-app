import { Alert, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import {useState, useRef} from "react";
import DateTimePicker from '@react-native-community/datetimepicker';

type Task = {
  id: number;
  title: string;
  dueDate: Date;
};

export default function Index() {
  const [dueDate, setDueDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const nextTaskId = useRef(1);

  function addTask() {
    const title = taskTitle.trim();
    if (title === "") {
      Alert.alert("Task name needed", "Please type a task first.");
      return;
    }
    const newTask: Task = {
      id: nextTaskId.current,
      title: title,
      dueDate: dueDate,
    }

    nextTaskId.current += 1;
    setTasks((previousTasks) => [...previousTasks, newTask]);
    setTaskTitle("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My tasks</Text>
      <TextInput
        style={[styles.task, styles.taskText]}
        placeholder="What needs doing?"
        placeholderTextColor="#64748b"
        value={taskTitle}
        onChangeText={setTaskTitle}
      />

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{gap:12, paddingVertical: 12}}
      >
        {tasks.map((task) => (
          <View key={task.id} style={styles.task}>
            <Text style={styles.taskText}>{task.title}</Text>
            <Text style={styles.taskText}>Due: {task.dueDate.toLocaleDateString()}</Text>
          </View>
        ))}
      </ScrollView>
      <Pressable style={[styles.task, styles.additionalTask]} 
        onPress={addTask}
        accessibilityLabel="Add a new task" 
        accessibilityRole="button"
        >
        <Text style={styles.additionalTaskText}>Add a new task</Text>
        <Text style={styles.additionalTaskText}>+</Text>
      </Pressable>
      <Pressable
        style={[styles.task, styles.additionalTask]}
        accessibilityRole="button"
        onPress={() => setShowCalendar(true)}
      >
        <Text style={styles.taskText}>Choose Due Date</Text>
      </Pressable>

      <Text style={styles.taskText}> Due: {dueDate.toLocaleDateString()}</Text>

      {showCalendar && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          onValueChange={(_event, selectedDate) => {
            setDueDate(selectedDate);
            setShowCalendar(false);
          }}
          onDismiss={() => setShowCalendar(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f1f5f9",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 24,
  },
  task: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  taskText: {
    fontSize: 16,
    color: "#0f172a",
  },
  additionalTask: {
    marginTop: 12,
  },
  additionalTaskText: {
    fontSize: 24,
    color: "#0f172a",
    textAlign: "center",
  },
});
