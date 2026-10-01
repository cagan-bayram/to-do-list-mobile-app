import DateTimePicker from '@react-native-community/datetimepicker';
import Storage from "expo-sqlite/kv-store";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, AppState } from "react-native";

type TaskPriority = "Low" | "Medium" | "High";

type Task = {
  id: number;
  title: string;
  dueDate: Date;
  completed: boolean;
  priority: TaskPriority;
};

type StoredTask = {
  id: number;
  title: string;
  dueDate: string;
  completed?: boolean;
  priority?: TaskPriority;
}

const TASKS_STORAGE_KEY = "todo.tasks.v1";

type TaskFilter = "All" | "Active" | "Completed" | "Overdue";

const TaskFilters: TaskFilter[] = ["All", "Active", "Completed", "Overdue"];
const taskPriorities: TaskPriority[] = ["Low", "Medium", "High"];
const priorityColors: Record<TaskPriority, { backgroundColor: string; color: string }> = {
  Low: { backgroundColor: "#dbeafe", color: "#1e40af" },
  Medium: { backgroundColor: "#fef3c7", color: "#92400e" },
  High: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

function isTaskOverdue(task: Task, today = new Date()) {
  if (task.completed) {
    return false;
  }

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return task.dueDate < startOfToday;
}

export default function Index() {
  const [dueDate, setDueDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("Medium");
  const [tasks, setTasks] = useState<Task[]>([]);
  const nextTaskId = useRef(1);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [today, setToday] = useState(() => new Date());

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setDueDate(task.dueDate);
    setTaskPriority(task.priority);
    setShowCalendar(false);
  }

  function resetForm() {
    setEditingTaskId(null);
    setTaskTitle("");
    setDueDate(new Date());
    setTaskPriority("Medium");
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
      updateTask(editingTaskId, title, dueDate, taskPriority);
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
      completed: false,
      priority: taskPriority,
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
    Alert.alert(
      "Deleting a task",
      `Do you really want to delete "${taskToRemove.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (editingTaskId === taskId) {
              resetForm();
            }
            setTasks((previousTasks) => previousTasks.filter((task) => task.id !== taskId));
            Alert.alert("Task removed", `Task "${taskToRemove.title}" has been removed.`);
          },
        },
      ],
      { cancelable: true }
    );
  }

  function updateTask(taskId: number, newTitle: string, newDueDate: Date, newPriority: TaskPriority) {
    const title = newTitle.trim();
    if (title === "") {
      Alert.alert("Task name needed", "Please type a task first.");
      return;
    }
    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId
          ? { ...task, title: title, dueDate: newDueDate, priority: newPriority }
          : task
      )
    );

    tasks.forEach((task) => {
      if (task.id === taskId) {
        Alert.alert("Task updated", `Task "${title}" has been updated.`);
      }
    });
  }

  function toggleTask(taskId: number) {
    setTasks((previousTasks) => previousTasks.map((task) => task.id === taskId ? {...task, completed: !task.completed} : task));
  }

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;
    function refreshToday() {
      if (midnightTimer !== undefined) {
        clearTimeout(midnightTimer);
      }

      const now = new Date();
      setToday(now);

      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );

      const delay = nextMidnight.getTime() - now.getTime() + 100;
      midnightTimer = setTimeout(refreshToday, delay);
    }

    refreshToday();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshToday();
      }
    });

    return () => {
      if (midnightTimer !== undefined) {
        clearTimeout(midnightTimer);
      }

      subscription.remove();
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    let cancelled = false;

    // Save snapshots in order so an older write cannot overwrite a newer edit.
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await Storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        if (!cancelled) {
          setStorageError(null);
        }
      } catch {
        if (!cancelled) {
          setStorageError("Your latest changes could not be saved on this device. Please try again.");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tasks, hasLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        await saveQueue.current;
        const json = await Storage.getItem(TASKS_STORAGE_KEY);
        if (cancelled) {
          return;
        }

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
              completed: task.completed === true,
              // Older saved tasks do not have a priority yet.
              priority: task.priority === "Low" || task.priority === "High"
                ? task.priority
                : "Medium",
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
        if (!cancelled) {
          setStorageError("Could not load saved tasks. Please reopen the app to try again.");
        }
      }
    }

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(normalizedSearch);
    if (!matchesSearch) {
      return false;
    }

    if (filter === "Active") {
      return !task.completed;
    } else if (filter === "Completed") {
      return task.completed;
    } else if (filter === "Overdue") {
      return isTaskOverdue(task, today);
    }
    return true;
  });

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

      <View style={styles.priorityField}>
        <Text style={styles.fieldLabel}>Priority</Text>
        <View
          style={styles.priorityOptions}
          accessibilityRole="radiogroup"
          accessibilityLabel="Task priority"
        >
          {taskPriorities.map((priority) => (
            <Pressable
              key={priority}
              onPress={() => setTaskPriority(priority)}
              accessibilityRole="radio"
              accessibilityLabel={`${priority} priority`}
              accessibilityState={{ checked: taskPriority === priority }}
              style={[
                styles.priorityOption,
                taskPriority === priority && {
                  backgroundColor: priorityColors[priority].backgroundColor,
                  borderColor: priorityColors[priority].color,
                },
              ]}
            >
              <Text
                style={[
                  styles.priorityOptionText,
                  taskPriority === priority && { color: priorityColors[priority].color },
                ]}
              >
                {taskPriority === priority ? "✓ " : ""}{priority}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View
        style={{flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12}}
      >
        {TaskFilters.map((option) => (
          <Pressable
            key={option}
            onPress={() => setFilter(option)}
            accessibilityRole="button"
            accessibilityState={{selected: filter === option}}
            style={{minHeight: 48, justifyContent: "center", paddingHorizontal: 12, borderRadius: 8, backgroundColor: filter === option ? "#0f172a" : "#e2e8f0"}}
          >
            <Text
              style={{color: filter === option ? "#ffffff" : "#0f172a"}}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      {/*Search bar*/}
      <TextInput
        style={[styles.task, styles.taskText, {marginTop: 12}]}
        placeholder="Search a task"
        placeholderTextColor="#64748b"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search tasks"
      />
      

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{gap:12, paddingVertical: 12}}
      >
        {visibleTasks.length === 0 && (
          <Text style={styles.taskText}>
            {normalizedSearch !== ""
              ? "No matching tasks."
              : filter === "All"
                ? "No tasks yet. Add your first one!"
                : `No ${filter.toLowerCase()} tasks.`
            }
          </Text>
        )}
        
        {visibleTasks.sort((a,b) => a.dueDate.getTime() - b.dueDate.getTime()).map((task) => (
          <View key={task.id} style={styles.task}>
            <View style={styles.taskHeader}>
              <Text style={[styles.taskText, styles.taskTitle]}>{task.title}</Text>
              {isTaskOverdue(task, today) && (
                <Text style={styles.overdueText} accessibilityLabel="Overdue task">
                  Overdue
                </Text>
              )}
            </View>
            <Text style={styles.taskText}>Due: {task.dueDate.toLocaleDateString()}</Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityColors[task.priority].backgroundColor },
              ]}
            >
              <Text style={[styles.priorityBadgeText, { color: priorityColors[task.priority].color }]}>
                {task.priority} priority
              </Text>
            </View>
            <Pressable
              onPress={() => toggleTask(task.id)}
              accessibilityLabel={task.title}
              accessibilityRole="checkbox"
              accessibilityState={{checked: task.completed}}
              style={{marginTop: 8, minHeight: 48, justifyContent: "center", padding: 8, borderRadius: 8, backgroundColor: "#e2e8f0"}}
            >
              <Text style={styles.taskText}>{task.completed ? "Completed - tap to undo" : "Mark complete"}</Text>
            </Pressable>
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
  priorityField: {
    marginTop: 12,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  priorityOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  priorityOption: {
    flexGrow: 1,
    minWidth: 88,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  priorityBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  taskTitle: {
    flex: 1,
  },
  overdueText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#b91c1c",
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
