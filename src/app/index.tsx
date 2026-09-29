import { Alert, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import {useState, useRef, useEffect} from "react";
import DateTimePicker from '@react-native-community/datetimepicker';
import Storage from "expo-sqlite/kv-store";

type Task = {
  id: number;
  title: string;
  dueDate: Date;
};

type StoredTask = {
  id: number;
  title: string;
  dueDate: string;
}

const TASKS_STORAGE_KEY = "todo.tasks.v1";

export default function Index() {
  const [dueDate, setDueDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const nextTaskId = useRef(1);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setDueDate(task.dueDate);
    setShowCalendar(false);
  }

  function resetForm() {
    setEditingTaskId(null);
    setTaskTitle("");
    setDueDate(new Date());
    setShowCalendar(false);
  }

  function saveTask() {
    const title = taskTitle.trim();
    if (title === "") {
      Alert.alert("Task name needed", "Please type a task first.");
      return;
    }
    
    if (editingTaskId === null) {
      addTask();
    } else {
      updateTask(editingTaskId, title, dueDate);
    }
    resetForm();
  }

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
    };

    nextTaskId.current += 1;
    setTasks((previousTasks) => [...previousTasks, newTask]);
    setTaskTitle("");
  }

  function removeTask(taskId: number) {
    const taskToRemove = tasks.find((task) => task.id === taskId);
    if (!taskToRemove) {
      Alert.alert("Task not found", "The task you are trying to remove does not exist.");
      return;
    }
    if (editingTaskId === taskId) {
        resetForm();
    }
    setTasks((previousTasks) => previousTasks.filter((task) => task.id !== taskId));

    tasks.forEach((task) => {
      if (task.id === taskId) {
        Alert.alert("Task removed", `Task "${taskToRemove.title}" has been removed.`);
      }
    });
  }

  function updateTask(taskId: number, newTitle: string, newDueDate: Date) {
    const title = newTitle.trim();
    if (title === "") {
      Alert.alert("Task name needed", "Please type a task first.");
      return;
    }
    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId ? { ...task, title: title, dueDate: newDueDate } : task
      )
    );

    tasks.forEach((task) => {
      if (task.id === taskId) {
        Alert.alert("Task updated", `Task "${title}" has been updated.`);
      }
    });
  }

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    try {
      Storage.setItemSync(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      setStorageError(null);
    } catch {
      setStorageError("Your latest changes could not be saved on this device. Please try again.");
    }
  }, [tasks, hasLoaded]);

  useEffect(() => {
    try {
      const json = Storage.getItemSync(TASKS_STORAGE_KEY);
      if (json !== null) {
        const storedTasks: StoredTask[] = JSON.parse(json);

        if (!Array.isArray(storedTasks)) {
          throw new Error("Invalid saved list");
        }
        const restoredTasks: Task[] = storedTasks.map((task) => {
          const restoredDate = new Date(task.dueDate);

          if (
            !Number.isSafeInteger(task.id) ||
            task.id < 1 ||
            typeof task.title !== "string" ||
            typeof task.dueDate !== "string" ||
            Number.isNaN(restoredDate.getTime())
          ) {
            throw new Error("Invalid saved task");
          }

          return {
            id: task.id,
            title: task.title,
            dueDate: restoredDate,
          };
        });

        const highestId = restoredTasks.reduce(
          (highest, task) => Math.max(highest, task.id), 0
        );

        nextTaskId.current = highestId + 1;
        setTasks(restoredTasks);
      }
      setStorageError(null);
      setHasLoaded(true);
    } catch {
      setStorageError("Could not load saved tasks. Please reopen the app to try again.");
    }
  }, []);

  if (!hasLoaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.taskText}>{storageError ?? "Loading tasks..."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My tasks</Text>
      {storageError !== null && (
        <Text style={styles.taskText}>{storageError}</Text>
      )}
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
            <Pressable
              style={{marginTop: 8, backgroundColor: "#ef4444", padding: 8, borderRadius: 8}}
              onPress={() => removeTask(task.id)}
              accessibilityLabel={`Remove task ${task.title}`}
              accessibilityRole="button"
            >
              <Text style={{color: "#ffffff"}}>Remove</Text>
            </Pressable>
            <Pressable
              style={{marginTop: 8, backgroundColor: "#3b82f6", padding: 8, borderRadius: 8}}
              onPress={() => startEditing(task)}
              accessibilityLabel={`Update task ${task.title}`}
              accessibilityRole="button"
            >
              <Text style={{color: "#ffffff"}}>Update</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Pressable style={[styles.task, styles.additionalTask]} 
        onPress={saveTask}
        accessibilityLabel={editingTaskId === null ? "Add a new task" : "Save changes"} 
        accessibilityRole="button"
        >
        <Text style={styles.additionalTaskText}>{editingTaskId === null ? "Add a new task" : "Save changes"}</Text>
        <Text style={styles.additionalTaskText}>+</Text>
      </Pressable>
      {editingTaskId !== null && (
        <Pressable
          style={[styles.task, styles.additionalTask]}
          onPress={resetForm}
          accessibilityRole="button"
        >
          <Text style={styles.taskText}>Cancel editing</Text>

        </Pressable>
      )}

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
