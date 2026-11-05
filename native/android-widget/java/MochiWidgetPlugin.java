package app.mochi.timetable;   // 同上，包名要和你的 App 一致

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 给网页端用的小插件：JS 里调用 MochiWidget.refresh()，立刻刷新桌面上所有 Mochi 小组件。 */
@CapacitorPlugin(name = "MochiWidget")
public class MochiWidgetPlugin extends Plugin {
    @PluginMethod
    public void refresh(PluginCall call) {
        Context ctx = getContext();
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, MochiWidgetProvider.class));
        for (int id : ids) MochiWidgetProvider.update(ctx, mgr, id);
        call.resolve();
    }
}
