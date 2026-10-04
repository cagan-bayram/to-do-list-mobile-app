package expo.modules.remindersettings

import android.app.AlarmManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ReminderSettingsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ReminderSettings")

    AsyncFunction("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        true
      } else {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.canScheduleExactAlarms()
      }
    }

    AsyncFunction("openAlarmSettings") {
      val action = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
      } else {
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS
      }
      val intent = Intent(action, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(intent)
      } catch (_: ActivityNotFoundException) {
        // Some manufacturers omit the app-specific special access screen.
        context.startActivity(
          Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      }
    }
  }
}
