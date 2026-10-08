import DateTimePicker from '@react-native-community/datetimepicker';
import Storage from "expo-sqlite/kv-store";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, AppState, Platform, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "@/components/AppIcon";
import ReminderField from "@/components/ReminderField";
import ReminderSetup from "@/components/ReminderSetup";
import { colors } from "@/constants/theme";
import { areRemindersReady, defaultReminderDate, restoreReminderDate, syncTaskReminders } from "@/lib/reminders";

type TaskPriority = "Low" | "Medium" | "High";

type Task = {
  id: number;
  title: string;
  dueDate: Date;
  completed: boolean;
  priority: TaskPriority;
  reminderAt: Date | null;
};

type StoredTask = {
  id: number;
  title: string;
  dueDate: string;
  completed?: boolean;
  priority?: TaskPriority;
  reminderAt?: string | null;
}

const TASKS_STORAGE_KEY = "todo.tasks.v1";

type TaskFilter = "All" | "Active" | "Completed" | "Overdue";

const TaskFilters: TaskFilter[] = ["All", "Active", "Completed", "Overdue"];
const taskPriorities: TaskPriority[] = ["Low", "Medium", "High"];
const priorityColors: Record<TaskPriority, { backgroundColor: string; color: string; dot: string }> = {
  Low: { backgroundColor: "#e8f4ea", color: "#28613a", dot: "#37834c" },
  Medium: { backgroundColor: "#fff3d8", color: "#805710", dot: "#bb810f" },
  High: { backgroundColor: "#fcebea", color: "#a13535", dot: "#ce4c4c" },
};

function isTaskOverdue(task: Task, today = new Date()) {
  if (task.completed) {
    return false;
  }

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return task.dueDate < startOfToday;
}

export default function Index() {
  const insets = useSafeAreaInsets();
  const [showForm, setShowForm] = useState(false);
  const [reminderSetup, setReminderSetup] = useState<"enable" | "repair" | null>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("Medium");
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [requestingReminderPermission, setRequestingReminderPermission] = useState(false);
  const reminderRequestVersion = useRef(0);
  const scrollView = useRef<ScrollView>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const nextTaskId = useRef(1);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [reminderRevision, setReminderRevision] = useState(0);
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [today, setToday] = useState(() => new Date());

  function startEditing(task: Task) {
    reminderRequestVersion.current += 1;
    setRequestingReminderPermission(false);
    setReminderSetup(null);
    setShowForm(true);
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setDueDate(task.dueDate);
    setTaskPriority(task.priority);
    setReminderAt(task.completed ? null : task.reminderAt);
    setShowCalendar(false);
    scrollView.current?.scrollTo({ y: 0, animated: true });
  }

  function resetForm() {
    reminderRequestVersion.current += 1;
    setRequestingReminderPermission(false);
    setReminderSetup(null);
    setShowForm(false);
    setEditingTaskId(null);
    setTaskTitle("");
    setDueDate(new Date());
    setTaskPriority("Medium");
    setReminderAt(null);
    setShowCalendar(false);
  }

  async function saveTask() {
    if (requestingReminderPermission) return;
    const title = taskTitle.trim();
    if (title === "") {
      Alert.alert("Task name needed", "Please type a task first.");
      return;
    }
    if (reminderAt !== null && reminderAt.getTime() <= new Date().getTime()) {
      Alert.alert("Choose a future reminder", "Select a future date and time, or turn off Remind me.");
      return;
    }
    if (reminderAt !== null) {
      const requestVersion = ++reminderRequestVersion.current;
      setRequestingReminderPermission(true);
      try {
        const ready = await areRemindersReady();
        if (requestVersion !== reminderRequestVersion.current) return;
        if (!ready) {
          Keyboard.dismiss();
          setReminderSetup("repair");
          return;
        }
      } catch {
        if (requestVersion === reminderRequestVersion.current) setReminderSetup("repair");
        return;
      } finally {
        if (requestVersion === reminderRequestVersion.current) setRequestingReminderPermission(false);
      }
    }
    
    if (editingTaskId === null) {
      addTask();
    } else {
      updateTask(editingTaskId, title, dueDate, taskPriority, reminderAt);
    }
    resetForm();
    Keyboard.dismiss();
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
      reminderAt,
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

  function updateTask(taskId: number, newTitle: string, newDueDate: Date, newPriority: TaskPriority, newReminderAt: Date | null) {
    const title = newTitle.trim();
    if (title === "") {
      Alert.alert("Task name needed", "Please type a task first.");
      return;
    }
    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId
          ? { ...task, title: title, dueDate: newDueDate, priority: newPriority, reminderAt: task.completed ? null : newReminderAt }
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
    if (editingTaskId === taskId) {
      reminderRequestVersion.current += 1;
      setRequestingReminderPermission(false);
      setReminderAt(null);
    }
    setTasks((previousTasks) => previousTasks.map((task) => task.id === taskId ? {...task, completed: !task.completed, reminderAt: null} : task));
  }

  async function enableReminder() {
    const requestVersion = ++reminderRequestVersion.current;
    setRequestingReminderPermission(true);
    setShowCalendar(false);
    Keyboard.dismiss();
    try {
      const allowed = await areRemindersReady();
      if (requestVersion !== reminderRequestVersion.current) return;
      if (allowed) {
        setReminderAt(defaultReminderDate());
      } else {
        setReminderSetup("enable");
      }
    } catch {
      if (requestVersion === reminderRequestVersion.current) {
        setReminderSetup("enable");
      }
    } finally {
      if (requestVersion === reminderRequestVersion.current) {
        setRequestingReminderPermission(false);
      }
    }
  }

  useEffect(() => {
    return () => {
      reminderRequestVersion.current += 1;
    };
  }, []);

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
        setReminderRevision((previous) => previous + 1);
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
        return;
      }

      // Reconcile only the latest saved list; stale effects must not recreate reminders.
      if (cancelled) return;
      try {
        await syncTaskReminders(tasks);
        if (!cancelled) setReminderError(null);
      } catch (error) {
        if (!cancelled) {
          setReminderError(error instanceof Error ? error.message : "Reminders could not be updated. Tap Retry reminders.");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tasks, hasLoaded, reminderRevision]);

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
              reminderAt: task.completed === true ? null : restoreReminderDate(task.reminderAt),
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

  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const progress = tasks.length === 0 ? 0 : completedCount / tasks.length;
  const contentInsets = { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 };

  if (!hasLoaded) {
    return (
      <View style={[styles.screen, styles.loading, contentInsets]}>
        <AppIcon name="list" size={36} color={colors.primary} />
        <Text style={styles.bodyText}>{storageError ?? "Getting your tasks ready..."}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        ref={scrollView}
        style={styles.screen}
        contentContainerStyle={[styles.container, contentInsets]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{today.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</Text>
            <Text style={styles.title} accessibilityRole="header">ToDoo<Text style={styles.titleDot}>.</Text></Text>
            <Text style={styles.subtitle}>{activeCount === 0 ? "A little space to plan your day." : `${activeCount} ${activeCount === 1 ? "thing" : "things"} to do. One at a time.`}</Text>
          </View>
          {Platform.OS !== "web" && (
            <Pressable style={styles.settingsButton} accessibilityRole="button" accessibilityLabel="Reminder settings"
              onPress={() => { Keyboard.dismiss(); setReminderSetup("repair"); }}>
              <AppIcon name="bell" color={colors.primary} />
            </Pressable>
          )}
        </View>

        {tasks.length > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.progressTitle}>{activeCount === 0 ? "All caught up" : "Making progress"}</Text>
              <Text style={styles.caption}>{completedCount} of {tasks.length} done</Text>
            </View>
            <View style={styles.progressTrack} accessible accessibilityRole="progressbar"
              accessibilityLabel="Tasks completed" accessibilityValue={{ min: 0, max: tasks.length, now: completedCount }}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        )}

        {storageError !== null && <Text style={styles.errorText} accessibilityRole="alert">{storageError}</Text>}
        {reminderError !== null && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Your reminders need attention</Text>
            <Text style={styles.warningText} accessibilityRole="alert">{reminderError}</Text>
            <View style={styles.wrappingRow}>
              <Pressable style={styles.warningButton} accessibilityRole="button" onPress={() => setReminderSetup("repair")}>
                <Text style={styles.warningTitle}>Set up reminders</Text>
              </Pressable>
              <Pressable style={styles.warningButton} accessibilityRole="button" onPress={() => setReminderRevision((previous) => previous + 1)}>
                <Text style={styles.warningTitle}>Retry reminders</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!showForm && (
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} accessibilityRole="button"
            onPress={() => { resetForm(); setShowForm(true); scrollView.current?.scrollTo({ y: 0, animated: true }); }}>
            <AppIcon name="plus" color="#ffffff" />
            <Text style={styles.primaryButtonText}>New task</Text>
          </Pressable>
        )}

        {showForm && (
          <View style={styles.formCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle} accessibilityRole="header">{editingTaskId === null ? "New task" : "Edit task"}</Text>
              <Pressable style={styles.iconButton} onPress={resetForm} accessibilityRole="button" accessibilityLabel="Cancel editing">
                <AppIcon name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>What needs doing?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Plan the weekend"
              placeholderTextColor={colors.muted}
              value={taskTitle}
              onChangeText={setTaskTitle}
              accessibilityLabel="Task name"
              editable={!requestingReminderPermission}
            />
            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.priorityOptions} accessibilityRole="radiogroup" accessibilityLabel="Task priority">
              {taskPriorities.map((priority) => (
                <Pressable key={priority} onPress={() => setTaskPriority(priority)} disabled={requestingReminderPermission}
                  accessibilityRole="radio" accessibilityLabel={`${priority} priority`}
                  accessibilityState={{ checked: taskPriority === priority }}
                  style={[styles.priorityOption, taskPriority === priority && {
                    backgroundColor: priorityColors[priority].backgroundColor,
                    borderColor: priorityColors[priority].dot,
                  }]}>
                  <View style={[styles.priorityDot, { backgroundColor: priorityColors[priority].dot }]} />
                  <Text style={[styles.priorityText, { color: priorityColors[priority].color }]}>{priority}</Text>
                  {taskPriority === priority && <AppIcon name="check" size={14} color={priorityColors[priority].color} />}
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.dateButton} accessibilityRole="button" onPress={() => setShowCalendar(!showCalendar)} disabled={requestingReminderPermission}>
              <View style={styles.inlineRow}>
                <AppIcon name="calendar" size={20} color={colors.primary} />
                <Text style={styles.bodyText}>Due date</Text>
              </View>
              <Text style={styles.dateText}>{dueDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</Text>
            </Pressable>
            {showCalendar && (
              <>
                <DateTimePicker value={dueDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} themeVariant="light"
                  onValueChange={(_event, selectedDate) => { setDueDate(selectedDate); if (Platform.OS !== "ios") setShowCalendar(false); }}
                  onDismiss={() => setShowCalendar(false)} />
                {Platform.OS === "ios" && (
                  <Pressable style={styles.secondaryButton} onPress={() => setShowCalendar(false)} accessibilityRole="button">
                    <Text style={styles.secondaryButtonText}>Done</Text>
                  </Pressable>
                )}
              </>
            )}
            <ReminderField key={editingTaskId ?? "new-task"} value={reminderAt} onChange={setReminderAt}
              onEnable={() => void enableReminder()} requestingPermission={requestingReminderPermission}
              onSetup={() => setReminderSetup("repair")}
              disabled={tasks.some((task) => task.id === editingTaskId && task.completed)} />
            <Pressable style={({ pressed }) => [styles.primaryButton, requestingReminderPermission && styles.disabledButton, pressed && styles.pressed]}
              onPress={() => void saveTask()} disabled={requestingReminderPermission}
              accessibilityRole="button" accessibilityState={{ disabled: requestingReminderPermission }}>
              <AppIcon name={editingTaskId === null ? "plus" : "check"} color="#ffffff" size={20} />
              <Text style={styles.primaryButtonText}>{requestingReminderPermission ? "Checking reminders..." : editingTaskId === null ? "Add task" : "Save changes"}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Your list</Text>
          <Text style={styles.caption}>By due date</Text>
        </View>
        <View style={styles.searchField}>
          <AppIcon name="search" size={20} color={colors.muted} />
          <TextInput style={styles.searchInput} placeholder="Find a task" placeholderTextColor={colors.muted}
            value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false}
            accessibilityLabel="Search tasks" />
          {searchQuery !== "" && (
            <Pressable style={styles.iconButton} onPress={() => setSearchQuery("")} accessibilityRole="button" accessibilityLabel="Clear search">
              <AppIcon name="close" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <View style={styles.filters}>
          {TaskFilters.map((option) => (
            <Pressable key={option} onPress={() => setFilter(option)} accessibilityRole="button"
              accessibilityState={{ selected: filter === option }} style={[styles.filter, filter === option && styles.filterSelected]}>
              <Text style={[styles.filterText, filter === option && styles.filterTextSelected]}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.taskList}>
          {visibleTasks.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><AppIcon name={normalizedSearch ? "search" : "list"} size={32} color={colors.primary} /></View>
              <Text style={styles.sectionTitle}>{normalizedSearch ? "Nothing found" : filter === "All" ? "A clear space" : `No ${filter.toLowerCase()} tasks`}</Text>
              <Text style={styles.emptyText}>{normalizedSearch ? "Try a different word or another filter." : filter === "All" ? "Start with one small thing. Add your first task above." : "Your tasks will appear here when they match this filter."}</Text>
            </View>
          )}
          {visibleTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).map((task) => (
            <View key={task.id} style={[styles.taskCard, task.completed && styles.completedCard]}>
              <View style={styles.taskTop}>
                <Pressable onPress={() => toggleTask(task.id)} accessibilityRole="checkbox"
                  accessibilityLabel={`${task.completed ? "Reopen" : "Complete"} ${task.title}`}
                  accessibilityState={{ checked: task.completed }} style={styles.completionTarget}>
                  <View style={[styles.completionCircle, task.completed && styles.completionCircleChecked]}>
                    {task.completed && <AppIcon name="check" size={19} color="#ffffff" />}
                  </View>
                </Pressable>
                <View style={styles.taskDetails}>
                  <Text style={[styles.taskTitle, task.completed && styles.completedTitle]}>{task.title}</Text>
                  <View style={styles.metadataRow}>
                    <AppIcon name="calendar" size={15} color={isTaskOverdue(task, today) ? colors.danger : colors.muted} />
                    <Text style={[styles.caption, styles.flexText, isTaskOverdue(task, today) && styles.overdueText]}>
                      {task.dueDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      {isTaskOverdue(task, today) ? " · Overdue" : ""}
                    </Text>
                  </View>
                  {task.reminderAt !== null && !task.completed && (
                    <View style={styles.metadataRow}>
                      <AppIcon name="bell" size={15} color={colors.muted} />
                      <Text style={[styles.caption, styles.flexText]}>Reminder: {task.reminderAt.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.taskFooter}>
                <View style={[styles.priorityBadge, { backgroundColor: priorityColors[task.priority].backgroundColor }]}>
                  <View style={[styles.smallDot, { backgroundColor: priorityColors[task.priority].dot }]} />
                  <Text style={[styles.badgeText, { color: priorityColors[task.priority].color }]}>{task.priority}</Text>
                </View>
                <View style={styles.taskActions}>
                  <Pressable style={styles.taskAction} onPress={() => startEditing(task)} accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`}>
                    <AppIcon name="edit" size={17} color={colors.muted} /><Text style={styles.actionText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.taskAction} onPress={() => removeTask(task.id)} accessibilityRole="button" accessibilityLabel={`Delete ${task.title}`}>
                    <AppIcon name="trash" size={17} color={colors.danger} /><Text style={[styles.actionText, styles.overdueText]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.caption}>ToDoo</Text>
          <Link href="/privacy" asChild>
            <Pressable style={styles.privacyLink} accessibilityRole="link">
              <Text style={styles.privacyLinkText}>Privacy policy</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
      {reminderSetup !== null && (
        <ReminderSetup onClose={() => setReminderSetup(null)} onReady={() => {
          if (reminderSetup === "enable") setReminderAt(defaultReminderDate());
          setReminderSetup(null);
          setReminderRevision((previous) => previous + 1);
        }} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 20, width: "100%", maxWidth: 640, alignSelf: "center", gap: 16 },
  loading: { alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1 },
  eyebrow: { color: colors.muted, fontSize: 13, fontWeight: "500", marginBottom: 6 },
  title: { color: colors.ink, fontSize: 38, fontWeight: "700", letterSpacing: -1.5 },
  titleDot: { color: colors.primary },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 4 },
  settingsButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  progressCard: { backgroundColor: colors.primarySoft, padding: 18, borderRadius: 20, gap: 12 },
  rowBetween: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  progressTitle: { fontSize: 15, fontWeight: "600", color: colors.primary },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "#cbded0", overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  primaryButton: { minHeight: 54, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.primary, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center" },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#ffffff", flexShrink: 1 },
  pressed: { opacity: 0.8 },
  disabledButton: { opacity: 0.45 },
  formCard: { padding: 18, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "600", flexShrink: 1 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.ink },
  input: { minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  priorityOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priorityOption: { flexGrow: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  priorityDot: { width: 9, height: 9, borderRadius: 5 },
  priorityText: { fontSize: 13, fontWeight: "600" },
  dateButton: { minHeight: 52, flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 14, backgroundColor: colors.background },
  inlineRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  bodyText: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  dateText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  listHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 8 },
  searchField: { flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 4, gap: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 52, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filter: { minHeight: 48, paddingHorizontal: 13, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderRadius: 24 },
  filterSelected: { backgroundColor: colors.ink },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  filterTextSelected: { color: "#ffffff" },
  taskList: { gap: 12 },
  emptyState: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24, gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 280 },
  taskCard: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  completedCard: { backgroundColor: "#eef2ed" },
  taskTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  completionTarget: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  completionCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#92a298", alignItems: "center", justifyContent: "center" },
  completionCircleChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  taskDetails: { flex: 1, minWidth: 0, paddingTop: 10, gap: 7 },
  taskTitle: { fontSize: 17, fontWeight: "600", lineHeight: 24, color: colors.ink },
  completedTitle: { textDecorationLine: "line-through", color: colors.muted },
  metadataRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  flexText: { flexShrink: 1 },
  overdueText: { color: colors.danger },
  taskFooter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
  priorityBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  smallDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  taskActions: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  taskAction: { minHeight: 48, paddingHorizontal: 8, flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center" },
  actionText: { color: colors.muted, fontSize: 13, fontWeight: "500" },
  errorText: { color: colors.danger, fontSize: 14, lineHeight: 22 },
  warningCard: { backgroundColor: colors.warningSoft, borderRadius: 18, padding: 16, gap: 8 },
  warningTitle: { color: colors.warning, fontSize: 14, fontWeight: "600" },
  warningText: { color: colors.warning, fontSize: 14, lineHeight: 22 },
  wrappingRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  warningButton: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  privacyLink: { minHeight: 48, justifyContent: "center", paddingHorizontal: 4 },
  privacyLinkText: { color: colors.primary, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
